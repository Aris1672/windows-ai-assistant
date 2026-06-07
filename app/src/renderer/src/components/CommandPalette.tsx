/**
 * app/src/renderer/src/components/CommandPalette.tsx
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContextBundle, Action } from '../types/electron'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://your-app.vercel.app'

type Mode = 'idle' | 'thinking' | 'streaming' | 'done' | 'error'

interface CommandPaletteProps {
  token: string
  onLogout: () => void
}

// ─── Skill type ───────────────────────────────────────────────────────────────

interface Skill {
  id: string
  name: string
  description: string | null
  prompt: string
  context_app: string | null
  context_folder: string | null
  is_destructive: boolean
  is_active: boolean
}

// ─── Action metadata ──────────────────────────────────────────────────────────

const ACTION_REQUIRES_CONFIRM: Record<Action['type'], boolean> = {
  insert_text:       true,
  copy_to_clipboard: false,
  open_folder:       false,
  open_file:         false,
  open_url:          false,
}

// Returns a translated label for a given action type.
// Replaces the former static ACTION_LABELS object.
function getActionLabel(type: Action['type'], t: (key: string) => string): string {
  return t(`palette.actions.${type}`)
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

interface ParsedResponse {
  displayText: string
  action: Action | null
}

function parseActionFromResponse(raw: string): ParsedResponse {
  const match = raw.match(/<action\s+type="([^"]+)">([\s\S]*?)<\/action>/)
  if (!match) return { displayText: raw.trim(), action: null }

  const [fullMatch, type, content] = match
  const displayText = raw.replace(fullMatch, '').trim()
  const value = content.trim()

  let action: Action | null = null
  switch (type) {
    case 'insert_text':       action = { type: 'insert_text',       text: value }; break
    case 'copy_to_clipboard': action = { type: 'copy_to_clipboard', text: value }; break
    case 'open_folder':       action = { type: 'open_folder',       path: value }; break
    case 'open_file':         action = { type: 'open_file',         path: value }; break
    case 'open_url':          action = { type: 'open_url',          url:  value }; break
  }

  return { displayText, action }
}

function stripActionTagLive(text: string): string {
  return text.replace(/<action[\s\S]*$/, '').trim()
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M6 1a5 5 0 100 10A5 5 0 006 1zM0 6a6 6 0 1110.89 3.477l3.817 3.816a.75.75 0 01-1.06 1.061l-3.817-3.816A6 6 0 010 6z"
        fill="currentColor" fillRule="evenodd" clipRule="evenodd"
      />
    </svg>
  )
}

function SpinnerIcon(): JSX.Element {
  return <span className="spinner" aria-label="Loading" />
}

// ─── SSE chunk parser ─────────────────────────────────────────────────────────

interface ParsedChunk {
  text: string
  serverError?: string
}

function parseSSEChunk(raw: string): ParsedChunk {
  let text = ''
  let serverError: string | undefined

  for (const line of raw.split('\n')) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]') continue

    try {
      const parsed = JSON.parse(data)
      if (parsed?.type === 'error') {
        serverError = parsed.message ?? 'AI response failed'
      } else if (parsed?.type === 'delta') {
        text += parsed.text ?? ''
      }
    } catch {
      // skip malformed SSE lines
    }
  }

  return { text, serverError }
}

// ─── System shell detector ────────────────────────────────────────────────────
// Returns true for file managers and OS shells — not "real work" apps.
// When the active app is a system shell, no app-filtered skills are shown.

const SYSTEM_SHELLS = [
  'проводник',   // Windows Explorer (Russian)
  'explorer',    // Windows Explorer (English)
  'finder',      // macOS Finder
  'nautilus',    // GNOME Files
  'dolphin',     // KDE Dolphin
  'thunar',      // XFCE Thunar
  'files',       // GNOME Files alt name
]

function isSystemShell(app: string | null): boolean {
  if (!app) return true
  const a = app.toLowerCase()
  return SYSTEM_SHELLS.some(shell => a.includes(shell))
}

// ─── Semantic app matcher ─────────────────────────────────────────────────────
// Matches a user-typed filter (e.g. "Foxit PDF") against the active app name
// (e.g. "Foxit PDF Reader 12.1.0") using word-level fuzzy matching.
// Rules:
//   1. Direct substring check in either direction
//   2. Every significant word in the filter must appear (as a substring) in
//      at least one word of the active app name
// This means "excel" matches "Microsoft Excel 365", "pdf" matches "Foxit PDF
// Reader", "foxit pdf" matches "Foxit PDF Reader 12", etc.

function appMatchesFilter(filter: string | null, activeApp: string | null): boolean {
  if (!filter) return true   // no filter → always visible
  if (!activeApp) return false

  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

  const f = normalize(filter)
  const a = normalize(activeApp)

  // Fast path: one contains the other
  if (a.includes(f) || f.includes(a)) return true

  // Word-level: every meaningful word in filter must match some word in app
  const noise = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'on', 'at'])
  const fWords = f.split(' ').filter(w => w.length > 1 && !noise.has(w))
  const aWords = a.split(' ').filter(w => w.length > 1 && !noise.has(w))

  return fWords.length > 0 &&
    fWords.every(fw => aWords.some(aw => aw.includes(fw) || fw.includes(aw)))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveActiveFolder(context: ContextBundle | null): string | null {
  return context?.activeFilePath
    ? (context.activeFilePath.replace(/[/\\][^/\\]+$/, '') || null)
    : null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandPalette({ token, onLogout }: CommandPaletteProps): JSX.Element {
  const { t, i18n } = useTranslation()

  const [query, setQuery]     = useState('')
  const [context, setContext] = useState<ContextBundle | null>(null)
  const [rawResponse, setRawResponse] = useState('')
  const [mode, setMode]       = useState<Mode>('idle')
  const [visible, setVisible] = useState(false)

  // Action state
  const [pendingAction, setPendingAction] = useState<Action | null>(null)
  const [displayText, setDisplayText]     = useState('')
  const [actionStatus, setActionStatus]   = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [actionError, setActionError]     = useState<string | null>(null)
  const [confirmed, setConfirmed]         = useState(false)

  // Skill state
  const [skills, setSkills]             = useState<Skill[]>([])
  const [pendingSkill, setPendingSkill] = useState<Skill | null>(null)

  // Auto-updater state — set when a new version is downloaded and ready
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)

  // ── Conversation thread ───────────────────────────────────────────────────
  // Committed exchanges — each submit appends the previous user+assistant turn.
  interface ThreadMessage { role: 'user' | 'assistant'; text: string; isError?: boolean }
  const [messages, setMessages] = useState<ThreadMessage[]>([])

  // ── Workflow memory state ─────────────────────────────────────────────────
  // conversationId is set after the first response completes.
  // It's passed to executeAction so the action record links to its session.
  const [conversationId, setConversationId] = useState<string | null>(null)

  // Refs for async callbacks that need current values without stale closures
  const lastQueryRef        = useRef('')                                      // query text at submit time
  const rawResponseRef      = useRef('')                                      // mirrors rawResponse for use in async callbacks
  const conversationCreationRef = useRef<Promise<string | null>>(Promise.resolve(null))

  const inputRef    = useRef<HTMLInputElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  // ── Derived: active folder + matching skills ───────────────────────────────
  const activeFolder = deriveActiveFolder(context)

  const matchingSkills = skills.filter(skill => {
    if (!skill.is_active) return false
    if (isSystemShell(context?.activeApp ?? null)) return false
    if (!appMatchesFilter(skill.context_app, context?.activeApp ?? null)) return false
    if (skill.context_folder && !activeFolder?.startsWith(skill.context_folder)) return false
    return true
  })

  // ── Fetch skills whenever the palette becomes visible ─────────────────────
  useEffect(() => {
    if (!visible) return

    window.electronAPI.apiRequest({
      url:     `${WEB_URL}/api/skills`,
      method:  'GET',
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      if (res.ok && Array.isArray(res.data)) {
        setSkills(res.data as Skill[])
      }
    }).catch(() => {})
  }, [visible, token])

  // ── Keep rawResponseRef in sync ───────────────────────────────────────────
  useEffect(() => {
    rawResponseRef.current = rawResponse
  }, [rawResponse])

  // ── Parse action + save conversation when streaming finishes ─────────────
  useEffect(() => {
    if (mode !== 'done' && mode !== 'error') return

    const { displayText: dt, action } = parseActionFromResponse(rawResponse)
    setDisplayText(dt)
    setPendingAction(action)
    setActionStatus('idle')
    setActionError(null)
    setConfirmed(false)

    if (action && !ACTION_REQUIRES_CONFIRM[action.type]) {
      runAction(action)
    }

    // Save the conversation + messages — fire-and-forget
    if (mode === 'done') {
      const capturedQuery    = lastQueryRef.current
      const capturedResponse = rawResponseRef.current

      conversationCreationRef.current
        .then(async (convId) => {
          if (!convId || !capturedQuery) return

          // Store the ID so executeAction can link to this session
          setConversationId(convId)

          // Batch-save both turns
          await window.electronAPI.apiRequest({
            url:     `${WEB_URL}/api/conversations/${convId}/messages`,
            method:  'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
              messages: [
                { role: 'user',      content: capturedQuery    },
                { role: 'assistant', content: capturedResponse },
              ],
            },
          })
        })
        .catch(() => {})  // non-fatal
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Execute action ────────────────────────────────────────────────────────
  const runAction = useCallback(async (action: Action) => {
    setActionStatus('running')
    // Pass conversationId so the action record links to this session.
    // Uses functional ref pattern to avoid stale closure over state.
    const result = await window.electronAPI.executeAction(action, conversationId)
    if (result.ok) {
      setActionStatus('done')
      setPendingAction(null)
    } else {
      setActionStatus('error')
      setActionError(result.error ?? 'Action failed')
    }
  }, [conversationId])

  // ── Core streaming submit ─────────────────────────────────────────────────
  const submitQuery = useCallback((message: string): void => {
    if (!message || mode === 'thinking' || mode === 'streaming') return

    // ── Build history snapshot BEFORE any state updates ─────────────────────
    // We read `messages` (current committed turns) and the just-finished
    // exchange from refs — both are synchronously available right now.
    // After setMessages() fires, React state is async and we can't rely on it.
    const historySnapshot: { role: 'user' | 'assistant'; content: string }[] = [
      // All previously committed turns
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.text })),
      // The exchange that just finished (about to be committed below)
      ...(lastQueryRef.current && rawResponseRef.current ? (() => {
        const { displayText: prevDisplay } = parseActionFromResponse(rawResponseRef.current)
        const prevText = prevDisplay || rawResponseRef.current
        return [
          { role: 'user'      as const, content: lastQueryRef.current },
          { role: 'assistant' as const, content: prevText },
        ]
      })() : []),
    ]

    // Commit the previous exchange (if any) to the conversation thread
    if (lastQueryRef.current && rawResponseRef.current) {
      const { displayText: prevDisplay } = parseActionFromResponse(rawResponseRef.current)
      const prevText = prevDisplay || rawResponseRef.current
      setMessages(prev => [
        ...prev,
        { role: 'user'      as const, text: lastQueryRef.current },
        { role: 'assistant' as const, text: prevText },
      ])
    }

    // Clear input and reset live response state
    setQuery('')
    setMode('thinking')
    setRawResponse('')
    rawResponseRef.current = ''
    setDisplayText('')
    setPendingAction(null)
    setPendingSkill(null)
    setConversationId(null)
    setActionStatus('idle')
    setActionError(null)
    setConfirmed(false)

    // Capture query for message saving after response
    lastQueryRef.current = message

    // Create the conversation record in parallel with the stream.
    // We don't await it here — the done effect will pick up the resolved ID.
    conversationCreationRef.current = window.electronAPI.apiRequest({
      url:     `${WEB_URL}/api/conversations`,
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title:          message.slice(0, 80),
        context_app:    context?.activeApp    ?? null,
        context_folder: deriveActiveFolder(context),
        context_text:   context?.selectedText ?? null,
      },
    }).then(res => {
      if (res.ok && res.data && typeof (res.data as { id?: string }).id === 'string') {
        return (res.data as { id: string }).id
      }
      return null
    }).catch(() => null)

    // Fire the stream — pass full history so Claude remembers previous turns
    window.electronAPI.streamContext({
      url: `${WEB_URL}/api/context`,
      token,
      body: {
        message,
        activeApp:        context?.activeApp        ?? null,
        activeFolder:     deriveActiveFolder(context),
        selectedText:     context?.selectedText     ?? null,
        screenshotBase64: context?.screenshotBase64 ?? null,
        history: historySnapshot,
      },
    })
  }, [context, token, mode, messages])

  // ── Submit from input field ───────────────────────────────────────────────
  const submit = useCallback((): void => {
    submitQuery(query.trim())
  }, [query, submitQuery])

  // ── Trigger a skill button ────────────────────────────────────────────────
  const triggerSkill = useCallback((skill: Skill): void => {
    if (skill.is_destructive) {
      setPendingSkill(skill)
    } else {
      setQuery(skill.name)
      submitQuery(skill.prompt)
    }
  }, [submitQuery])

  // ── Confirm a destructive skill ───────────────────────────────────────────
  const confirmSkill = useCallback((): void => {
    if (!pendingSkill) return
    setQuery(pendingSkill.name)
    submitQuery(pendingSkill.prompt)
  }, [pendingSkill, submitQuery])

  // ── Stream event listener ─────────────────────────────────────────────────
  useEffect(() => {
    const off = window.electronAPI.onStreamEvent((ev) => {
      switch (ev.type) {
        case 'auth-error':
          onLogout()
          break
        case 'http-error':
          setMode('error')
          setRawResponse(t('palette.error.http', { status: ev.status }))
          break
        case 'error':
          setMode('error')
          setRawResponse(t('palette.error.generic'))
          break
        case 'done':
          setMode('done')
          break
        case 'chunk': {
          const { text, serverError } = parseSSEChunk(ev.data)
          if (serverError) {
            setMode('error')
            setRawResponse(serverError)
          } else if (text) {
            setMode('streaming')
            setRawResponse((prev) => prev + text)
          }
          break
        }
      }
    })
    return () => { off() }
  }, [onLogout, t])

  // ── IPC listeners ──────────────────────────────────────────────────────────
  useEffect(() => {
    const offShown = window.electronAPI.onPaletteShown(() => {
      setVisible(true)
      setQuery('')
      setRawResponse('')
      rawResponseRef.current = ''
      setDisplayText('')
      setMode('idle')
      setPendingAction(null)
      setPendingSkill(null)
      setSkills([])
      setConversationId(null)
      setMessages([])
      conversationCreationRef.current = Promise.resolve(null)
      lastQueryRef.current = ''
      setActionStatus('idle')
      setActionError(null)
      setConfirmed(false)
      setTimeout(() => inputRef.current?.focus(), 60)
    })

    const offHidden = window.electronAPI.onPaletteHidden(() => {
      setVisible(false)
      window.electronAPI.cancelStream()
    })

    const offContext = window.electronAPI.onContextData((ctx) => {
      setContext(ctx)
    })

    return () => { offShown(); offHidden(); offContext() }
  }, [])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (pendingSkill) {
          setPendingSkill(null)
        } else if (mode === 'thinking' || mode === 'streaming') {
          window.electronAPI.cancelStream()
          setMode('idle')
        } else {
          window.electronAPI.hidePalette()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, pendingSkill])

  // ── Auto-updater listener ─────────────────────────────────────────────────
  useEffect(() => {
    const off = window.electronAPI.onUpdaterEvent((ev) => {
      if (ev.type === 'downloaded') {
        setUpdateVersion(ev.version ?? 'new version')
      }
    })
    return () => { off() }
  }, [])

  // ── Auto-scroll response ───────────────────────────────────────────────────
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [displayText, rawResponse])

  // ─── Render ───────────────────────────────────────────────────────────────

  const busy        = mode === 'thinking' || mode === 'streaming'
  const shownText   = (mode === 'streaming') ? stripActionTagLive(rawResponse) : displayText
  const hasResponse = shownText.length > 0

  const needsConfirm    = pendingAction ? ACTION_REQUIRES_CONFIRM[pendingAction.type] : false
  const showActionBtn   = pendingAction !== null && actionStatus !== 'done' && mode !== 'error'
  const actionLabel     = pendingAction ? getActionLabel(pendingAction.type, t) : ''
  const actionIsRunning = actionStatus === 'running'

  const showSkillStrip   = !busy && matchingSkills.length > 0 && !pendingSkill
  const showSkillConfirm = pendingSkill !== null && !busy

  return (
    <div className={`palette-root ${visible ? 'palette-root--visible' : ''}`}>
      <div className={`palette ${visible ? 'palette--visible' : ''}`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Context strip */}
        {context?.activeApp && (
          <div className="context-strip">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
              <span className="context-app">{context.activeApp}</span>
              {deriveActiveFolder(context) && (
                <span
                  title={deriveActiveFolder(context) ?? ''}
                  style={{
                    fontSize: '0.62rem',
                    color: 'rgba(255,255,255,0.32)',
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '340px',
                  }}
                >
                  {deriveActiveFolder(context)}
                </span>
              )}
            </div>
            {context.selectedText && (
              <span className="context-excerpt">
                {context.selectedText.length > 72
                  ? `"${context.selectedText.slice(0, 72)}…"`
                  : `"${context.selectedText}"`}
              </span>
            )}
            {context.screenshotBase64 && (
              <span
                title="Screen captured — Claude can see what you're working on"
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                ◉ vision
              </span>
            )}
          </div>
        )}

        {/* Skill button strip */}
        {showSkillStrip && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.375rem',
            padding: '0.5rem 0.75rem',
            maxHeight: '80px',
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.1) transparent',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            {matchingSkills.map(skill => (
              <button
                key={skill.id}
                onClick={() => triggerSkill(skill)}
                title={skill.description ?? skill.prompt}
                style={{
                  flexShrink: 0,
                  padding: '0.25rem 0.625rem',
                  borderRadius: '5px',
                  border: `1px solid ${skill.is_destructive ? 'rgba(255,107,107,0.25)' : 'rgba(255,255,255,0.1)'}`,
                  background: skill.is_destructive ? 'rgba(255,82,82,0.08)' : 'rgba(255,255,255,0.05)',
                  color: skill.is_destructive ? '#ff6b6b' : 'rgba(255,255,255,0.7)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'background 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.4,
                }}
              >
                {skill.is_destructive && (
                  <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>⚠</span>
                )}
                {skill.name}
              </button>
            ))}
          </div>
        )}

        {/* Destructive skill confirm */}
        {showSkillConfirm && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.5rem 0.875rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '0.75rem', color: '#ff6b6b', flexShrink: 0 }}>⚠</span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', flex: 1 }}>
              {t('palette.confirm.prompt', { label: pendingSkill!.name })}
            </span>
            <button
              onClick={confirmSkill}
              style={{
                padding: '0.2rem 0.625rem', borderRadius: '4px',
                border: '1px solid rgba(255,107,107,0.3)', background: 'rgba(255,82,82,0.12)',
                color: '#ff6b6b', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              }}
            >
              {t('palette.confirm.confirm')}
            </button>
            <button
              onClick={() => setPendingSkill(null)}
              style={{
                padding: '0.2rem 0.5rem', borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0,
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        )}

        {/* Query input */}
        <div className="input-row">
          <span className="input-icon">
            {busy ? <SpinnerIcon /> : <SearchIcon />}
          </span>
          <input
            ref={inputRef}
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (pendingSkill) { confirmSkill() } else { submit() }
              }
            }}
            placeholder={t('palette.placeholder')}
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
          />
          {query && !busy && <kbd className="input-kbd">↵</kbd>}
          {busy && (
            <button
              className="cancel-btn"
              onClick={() => { window.electronAPI.cancelStream(); setMode('idle') }}
            >
              {t('palette.stop')}
            </button>
          )}
        </div>

        {/* Conversation thread — shown whenever there's history or a live turn */}
        {(messages.length > 0 || hasResponse || mode === 'thinking') && (
          <>
            <div className="divider" />
            <div className="response-area" ref={responseRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>

              {/* ── Committed history ── */}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    marginBottom: '0.5rem',
                    gap: '0.5rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <p
                    className="response-text"
                    style={{
                      maxWidth: '85%',
                      padding: '0.35rem 0.6rem',
                      borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                      background: msg.role === 'user'
                        ? 'rgba(0, 245, 160, 0.1)'
                        : 'rgba(255,255,255,0.04)',
                      border: msg.role === 'user'
                        ? '1px solid rgba(0, 245, 160, 0.18)'
                        : '1px solid rgba(255,255,255,0.07)',
                      margin: 0,
                      color: msg.role === 'user'
                        ? 'rgba(0, 245, 160, 0.9)'
                        : 'rgba(255,255,255,0.78)',
                      fontSize: '0.82rem',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.text}
                  </p>
                </div>
              ))}

              {/* ── Live turn: current user query (while pending response) ── */}
              {lastQueryRef.current && (mode === 'thinking' || mode === 'streaming') && (
                <div style={{ display: 'flex', flexDirection: 'row-reverse', marginBottom: '0.5rem' }}>
                  <p
                    className="response-text"
                    style={{
                      maxWidth: '85%',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '10px 10px 2px 10px',
                      background: 'rgba(0, 245, 160, 0.1)',
                      border: '1px solid rgba(0, 245, 160, 0.18)',
                      margin: 0,
                      color: 'rgba(0, 245, 160, 0.9)',
                      fontSize: '0.82rem',
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {lastQueryRef.current}
                  </p>
                </div>
              )}

              {/* ── Live turn: assistant response ── */}
              {mode === 'thinking' && !hasResponse && (
                <div className="thinking-dots" style={{ paddingLeft: '0.1rem' }}>
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
              )}
              {hasResponse && mode !== 'error' && (
                <p className="response-text" style={{ margin: '0 0 0.25rem 0' }}>
                  {shownText}
                  {mode === 'streaming' && <span className="caret" />}
                </p>
              )}
              {mode === 'error' && (
                <p className="response-text response-text--error" style={{ margin: 0 }}>
                  {shownText || rawResponse}
                </p>
              )}

              {/* ── Action button (live turn only) ── */}
              {showActionBtn && (
                <div className="action-row">
                  {actionStatus === 'error' && actionError && (
                    <span className="action-error">{actionError}</span>
                  )}
                  {needsConfirm && !confirmed ? (
                    <div className="action-confirm">
                      <span className="action-confirm-label">
                        {t('palette.confirm.prompt', { label: actionLabel })}
                      </span>
                      <button
                        className="action-btn action-btn--confirm"
                        onClick={() => { setConfirmed(true); runAction(pendingAction!) }}
                        disabled={actionIsRunning}
                      >
                        {actionIsRunning ? t('palette.actions.running') : t('palette.confirm.confirm')}
                      </button>
                      <button
                        className="action-btn action-btn--cancel"
                        onClick={() => setPendingAction(null)}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : needsConfirm && confirmed ? (
                    <div className="action-running">
                      <SpinnerIcon /><span>{actionLabel}…</span>
                    </div>
                  ) : (
                    <div className="action-running">
                      {actionIsRunning && <><SpinnerIcon /><span>{actionLabel}…</span></>}
                    </div>
                  )}
                </div>
              )}

              {actionStatus === 'done' && <p className="action-done">{t('palette.actions.done')}</p>}
            </div>
          </>
        )}

        {/* Update banner */}
        {updateVersion && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.4rem 0.875rem',
            background: 'rgba(0, 245, 160, 0.07)',
            borderTop: '1px solid rgba(0, 245, 160, 0.15)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '0.75rem', color: 'rgba(0, 245, 160, 0.85)' }}>
              {t('palette.update.ready', { version: updateVersion })}
            </span>
            <button
              onClick={() => window.electronAPI.updaterInstall()}
              style={{
                padding: '0.2rem 0.625rem',
                borderRadius: '4px',
                border: '1px solid rgba(0, 245, 160, 0.3)',
                background: 'rgba(0, 245, 160, 0.12)',
                color: 'rgb(0, 245, 160)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {t('palette.update.restart')}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="palette-footer">
          <span className="footer-esc">
            {pendingSkill ? t('palette.footer.escCancel') : busy ? t('palette.footer.escStop') : t('palette.footer.escClose')}
          </span>
          <div className="footer-actions">
            <button
              className="footer-btn"
              style={{ opacity: 0.45, fontSize: '0.68rem' }}
              onClick={() => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru')}
            >
              {i18n.language === 'ru' ? 'EN' : 'RU'}
            </button>
            <button className="footer-btn" onClick={() => window.electronAPI.openDashboard()}>
              {t('palette.footer.dashboard')}
            </button>
            <button className="footer-btn footer-btn--danger" onClick={onLogout}>
              {t('common.signOut')}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
