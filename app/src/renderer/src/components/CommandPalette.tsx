/**
 * app/src/renderer/src/components/CommandPalette.tsx
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ContextBundle, Action, ContextClip } from '../types/electron'

// FileRef mirrors the type from file-reader.ts
interface FileRef { filePath: string; fileName: string; content: string; truncated: boolean }

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://your-app.vercel.app'

// ─── Hotkey utilities ─────────────────────────────────────────────────────────

/** Convert a KeyboardEvent to an Electron accelerator string, e.g. "CommandOrControl+Space" */
function keyEventToAccelerator(e: KeyboardEvent): string | null {
  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'Super']
  if (modifierKeys.includes(e.key)) return null   // modifier-only press, wait for the real key

  const parts: string[] = []
  if (e.ctrlKey)  parts.push('CommandOrControl')
  if (e.altKey)   parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.metaKey)  parts.push('Super')

  if (parts.length === 0) return null  // must have at least one modifier

  const keyMap: Record<string, string> = {
    ' ':          'Space',
    'ArrowUp':    'Up',
    'ArrowDown':  'Down',
    'ArrowLeft':  'Left',
    'ArrowRight': 'Right',
    'Enter':      'Return',
    'Escape':     'Escape',
    'Tab':        'Tab',
    'Backspace':  'Backspace',
    'Delete':     'Delete',
    'Home':       'Home',
    'End':        'End',
    'PageUp':     'PageUp',
    'PageDown':   'PageDown',
  }

  const key = keyMap[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
  parts.push(key)

  return parts.join('+')
}

/** Convert an Electron accelerator to a human-readable display string */
function acceleratorToDisplay(acc: string): string {
  return acc.split('+').map(part => {
    if (part === 'CommandOrControl') return 'Ctrl'
    if (part === 'Super')            return 'Win'
    if (part === 'Return')           return 'Enter'
    return part
  }).join(' + ')
}

/** Simple deterministic hash of a string — used as dismiss key in store */
function simpleHash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

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
  if (!match) {
    // Fallback: stream was truncated before </action> closed.
    // Still execute the action with whatever content arrived — don't silently drop it.
    const truncated = raw.match(/<action\s+type="([^"]+)">([\s\S]*)$/)
    if (truncated) {
      const [, type, partialContent] = truncated
      const displayText = raw.replace(/<action[\s\S]*$/, '').trim()
      const value = partialContent.trim()
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
    return { displayText: raw.trim(), action: null }
  }

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

function PinIcon(): JSX.Element {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22"/>
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
    </svg>
  )
}

// ─── SSE chunk parser ─────────────────────────────────────────────────────────

interface ParsedChunk {
  text: string
  serverError?: string
  model?: string
}

function parseSSEChunk(raw: string): ParsedChunk {
  let text = ''
  let serverError: string | undefined
  let model: string | undefined

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
      } else if (parsed?.type === 'model') {
        model = parsed.model ?? undefined
      }
    } catch {
      // skip malformed SSE lines
    }
  }

  return { text, serverError, model }
}

// ─── System shell detector ────────────────────────────────────────────────────

const SYSTEM_SHELLS = [
  'проводник', 'explorer', 'finder', 'nautilus', 'dolphin', 'thunar', 'files',
]

function isSystemShell(app: string | null): boolean {
  if (!app) return true
  const a = app.toLowerCase()
  return SYSTEM_SHELLS.some(shell => a.includes(shell))
}

// ─── Semantic app matcher ─────────────────────────────────────────────────────

function appMatchesFilter(filter: string | null, activeApp: string | null): boolean {
  if (!filter) return true
  if (!activeApp) return false

  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

  const f = normalize(filter)
  const a = normalize(activeApp)

  if (a.includes(f) || f.includes(a)) return true

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

function clipSourceLabel(clip: ContextClip): string {
  const app  = clip.sourceApp ?? 'Unknown'
  const file = clip.filePath ? clip.filePath.split(/[/\\]/).pop() : null
  return file ? `${app} — ${file}` : app
}

// ─── Context hint ─────────────────────────────────────────────────────────────

function getContextHint(activeApp: string | null, t: (key: string) => string): string {
  if (!activeApp) return t('palette.hint.generic')

  const a = activeApp.toLowerCase()

  if (/word|libreoffice writer|wordpad|notepad|sublime|atom|obsidian/.test(a))
    return t('palette.hint.editor')

  if (/chrome|edge|firefox|opera|brave|safari/.test(a))
    return t('palette.hint.browser')

  if (/outlook|thunderbird|mailspring|mail/.test(a))
    return t('palette.hint.email')

  if (/excel|libreoffice calc|numbers|sheets/.test(a))
    return t('palette.hint.spreadsheet')

  if (/acrobat|sumatra|foxit|pdf/.test(a))
    return t('palette.hint.pdf')

  if (/code|cursor|webstorm|intellij|pycharm|rider|vim|nvim/.test(a))
    return t('palette.hint.code')

  if (isSystemShell(activeApp))
    return t('palette.hint.explorer')

  return t('palette.hint.generic')
}

// ─── Vision gate ──────────────────────────────────────────────────────────────

/**
 * Decides whether to send the screenshot to the API.
 *
 * Clipboard text is intentionally NOT checked here — that decision is made
 * server-side via a semantic relevance check (is the clipboard actually related
 * to what the user just asked?). The client always sends both clipboardText and
 * screenshotBase64; the server resolves which one to use.
 *
 * Client only skips vision when structured context that is always relevant
 * exists: file refs or tray clips. Those are explicit, intentional additions
 * by the user — unlike clipboard which may be stale.
 */
function shouldUseVision(
  screenshotBase64: string | null,
  fileRefs:         FileRef[],
  trayClips:        ContextClip[],
): boolean {
  if (!screenshotBase64)    return false  // nothing captured — skip
  if (fileRefs.length > 0)  return false  // file content is more precise
  if (trayClips.length > 0) return false  // tray clips are more precise

  return true  // let the server decide between clipboard and vision
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandPalette({ token, onLogout }: CommandPaletteProps): JSX.Element {
  const { t, i18n } = useTranslation()

  const [query, setQuery]     = useState('')
  const [context, setContext] = useState<ContextBundle | null>(null)
  const [rawResponse, setRawResponse] = useState('')
  const [mode, setMode]       = useState<Mode>('idle')
  const [visible, setVisible] = useState(false)

  // ── Vision (screen capture) state ─────────────────────────────────────────
  // Off by default — screenshotBase64 in `context` is only populated when the
  // user enables auto-vision in settings, or presses "Read my screen" for
  // this one query.
  const [autoVision, setAutoVision]               = useState(false)
  const [capturingScreen, setCapturingScreen]      = useState(false)

  // Action state
  const [pendingAction, setPendingAction] = useState<Action | null>(null)
  const [displayText, setDisplayText]     = useState('')
  const [actionStatus, setActionStatus]   = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [actionError, setActionError]     = useState<string | null>(null)
  const [confirmed, setConfirmed]         = useState(false)

  // Skill state
  const [skills, setSkills]             = useState<Skill[]>([])
  const [pendingSkill, setPendingSkill] = useState<Skill | null>(null)

  // ── Context Tray state ────────────────────────────────────────────────────
  const [trayClips, setTrayClips]       = useState<ContextClip[]>([])
  const [trayOpen, setTrayOpen]         = useState(false)

  // File reference state
  const [resolvedFiles, setResolvedFiles] = useState<FileRef[]>([])
  const [attachedFiles, setAttachedFiles] = useState<FileRef[]>([])
  const [hoveredMsgIdx, setHoveredMsgIdx] = useState<number | null>(null)

  // Voice input state
  const [isRecording, setIsRecording]           = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // Auto-updater state
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [activeModel, setActiveModel]       = useState<string | null>(null)

  // ── Workflow pattern suggestion state ────────────────────────────────────
  const [patternSuggestion, setPatternSuggestion] = useState<{
    name: string
    description: string
    suggested_prompt: string
    apps_involved: string[]
    confidence: number
  } | null>(null)
  const [patternDismissed, setPatternDismissed] = useState(false)
  // 1-hour in-memory cache so we don't call the API on every palette open
  const patternCacheRef = useRef<{ ts: number; pattern: typeof patternSuggestion } | null>(null)

  // ── Hotkey state ──────────────────────────────────────────────────────────
  const [hotkey, setHotkey]               = useState('CommandOrControl+Space')
  const [recordingHotkey, setRecordingHotkey] = useState(false)
  const [hotkeyPreview, setHotkeyPreview] = useState<string | null>(null)
  const [hotkeySaved, setHotkeySaved]     = useState(false)

  // ── Conversation thread ───────────────────────────────────────────────────
  interface ThreadMessage { role: 'user' | 'assistant'; text: string; isError?: boolean }
  const [messages, setMessages] = useState<ThreadMessage[]>([])

  // ── Workflow memory state ─────────────────────────────────────────────────
  const [conversationId, setConversationId] = useState<string | null>(null)

  const lastQueryRef        = useRef('')
  const rawResponseRef      = useRef('')
  const conversationCreationRef = useRef<Promise<string | null>>(Promise.resolve(null))
  const contextRef          = useRef<ContextBundle | null>(null)

  const inputRef    = useRef<HTMLTextAreaElement>(null)
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

  // ── Load tray clips on mount ───────────────────────────────────────────────
  useEffect(() => {
    window.electronAPI.trayGetClips()
      .then(clips => setTrayClips(clips))
      .catch(() => {})
  }, [])

  // ── Load saved hotkey on mount ────────────────────────────────────────────
  useEffect(() => {
    window.electronAPI.getHotkey().then(setHotkey).catch(() => {})
  }, [])

  // ── Load saved auto-vision preference on mount ───────────────────────────
  useEffect(() => {
    window.electronAPI.getAutoVision().then(setAutoVision).catch(() => {})
  }, [])

  // ── Hotkey recorder ───────────────────────────────────────────────────────
  // When recording mode is active, capture the next key combo in the capture
  // phase (before other handlers) and auto-confirm after a short delay.
  useEffect(() => {
    if (!recordingHotkey) return

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setRecordingHotkey(false)
        setHotkeyPreview(null)
        return
      }

      const acc = keyEventToAccelerator(e)
      if (!acc) return

      setHotkeyPreview(acc)

      // Auto-confirm after 700 ms — enough time for the user to see the preview
      setTimeout(async () => {
        const ok = await window.electronAPI.setHotkey(acc)
        if (ok) {
          setHotkey(acc)
          setHotkeySaved(true)
          setTimeout(() => setHotkeySaved(false), 1500)
        }
        setRecordingHotkey(false)
        setHotkeyPreview(null)
      }, 700)
    }

    // useCapture = true so we intercept before the palette's own keydown handler
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [recordingHotkey])

  // ── Keep rawResponseRef in sync ───────────────────────────────────────────
  useEffect(() => {
    rawResponseRef.current = rawResponse
  }, [rawResponse])

  // ── Keep contextRef in sync ───────────────────────────────────────────────
  useEffect(() => {
    contextRef.current = context
  }, [context])

  // ── Parse action + save conversation when streaming finishes ─────────────
  useEffect(() => {
    if (mode !== 'done' && mode !== 'error') return

    const { displayText: dt, action } = parseActionFromResponse(rawResponse)
    setDisplayText(dt)
    setPendingAction(action)
    setActionStatus('idle')
    setActionError(null)
    setConfirmed(false)
    setResolvedFiles([])

    if (action && !ACTION_REQUIRES_CONFIRM[action.type]) {
      runAction(action)
    }

    if (mode === 'done') {
      const capturedQuery    = lastQueryRef.current
      const capturedResponse = rawResponseRef.current

      // Commit the completed exchange to messages immediately so the pin button appears
      if (capturedQuery && capturedResponse) {
        const { displayText: prevDisplay } = parseActionFromResponse(capturedResponse)
        const prevText = prevDisplay || capturedResponse
        setMessages(prev => [
          ...prev,
          { role: 'user'      as const, text: capturedQuery },
          { role: 'assistant' as const, text: prevText },
        ])
        // Clear refs so submitQuery doesn't double-commit
        lastQueryRef.current = ''
        rawResponseRef.current = ''
      }

      const capturedContext = contextRef.current

      conversationCreationRef.current
        .then(async (convId) => {
          if (!convId || !capturedQuery) return
          setConversationId(convId)

          // Save messages to conversation
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

          // Log AI query to actions table — feeds History + Analytics
          window.electronAPI.apiRequest({
            url:     `${WEB_URL}/api/actions`,
            method:  'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
              action_type:     'query',
              action_label:    capturedQuery.slice(0, 100),
              context_app:     capturedContext?.activeApp ?? null,
              context_folder:  capturedContext?.activeFilePath
                ? capturedContext.activeFilePath.replace(/[/\\][^/\\]+$/, '') || null
                : null,
              status:          'done',
              conversation_id: convId,
            },
          }).catch(() => {})
        })
        .catch(() => {})
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Execute action ────────────────────────────────────────────────────────
  const runAction = useCallback(async (action: Action) => {
    setActionStatus('running')
    const result = await window.electronAPI.executeAction(action, conversationId)
    if (result.ok) {
      setActionStatus('done')
      setPendingAction(null)
    } else {
      setActionStatus('error')
      setActionError(result.error ?? 'Action failed')
    }
  }, [conversationId])

  // ── Attach file via picker ───────────────────────────────────────────────
  const pickFile = useCallback(async () => {
    const fileRef = await window.electronAPI.pickFile()
    if (!fileRef) return
    setAttachedFiles(prev => {
      // Avoid duplicates
      if (prev.some(f => f.filePath === fileRef.filePath)) return prev
      return [...prev, fileRef]
    })
  }, [])

  // ── Manual "Read my screen" capture ──────────────────────────────────────
  // On-demand only: the user explicitly asked us to look at their screen for
  // this query. Nothing is captured unless this is called (or autoVision is
  // enabled in settings).
  const captureScreenNow = useCallback(async () => {
    setCapturingScreen(true)
    try {
      const screenshotBase64 = await window.electronAPI.captureScreenshotNow()
      setContext(prev => prev ? { ...prev, screenshotBase64 } : prev)
    } finally {
      setCapturingScreen(false)
    }
  }, [])

  // ── Auto-vision toggle (settings) ────────────────────────────────────────
  const toggleAutoVision = useCallback(async () => {
    const next = !autoVision
    const ok = await window.electronAPI.setAutoVision(next)
    if (ok) setAutoVision(next)
  }, [autoVision])

  // ── Voice input ───────────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    console.log('[voice] clicked, isRecording=', isRecording)

    if (isRecording) {
      recognitionRef.current?.stop()
      return
    }

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    console.log('[voice] SR=', SR)
    if (!SR) {
      console.log('[voice] SpeechRecognition not available')
      return
    }

    const recognition = new SR()
    console.log('[voice] recognition created=', recognition)
    recognitionRef.current = recognition

    recognition.lang = i18n.language === 'ru' ? 'ru-RU' : 'en-US'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => { console.log('[voice] onstart'); setIsRecording(true) }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('[voice] onresult', event)
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('')
      setInterimTranscript(transcript)

      if (event.results[event.results.length - 1].isFinal) {
        setQuery(prev => (prev ? prev + ' ' : '') + transcript.trim())
        setInterimTranscript('')
        inputRef.current?.focus()
      }
    }

    recognition.onend = () => { console.log('[voice] onend'); setIsRecording(false); setInterimTranscript('') }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.log('[voice] onerror', event.error, event.message)
      setIsRecording(false)
      setInterimTranscript('')
    }

    console.log('[voice] calling start()')
    recognition.start()
    console.log('[voice] start() called')
  }, [isRecording, i18n.language])

  // ── Add current selection to tray ─────────────────────────────────────────
  const addToTray = useCallback(async () => {
    const text = context?.selectedText?.trim()
    if (!text) return

    const clip: ContextClip = {
      text,
      sourceApp: context?.activeApp    ?? null,
      filePath:  context?.activeFilePath ?? null,
      addedAt:   new Date().toISOString(),
    }

    const updated = await window.electronAPI.trayAddClip(clip)
    setTrayClips(updated)
    setTrayOpen(true)
  }, [context])

  // ── Remove a single clip ──────────────────────────────────────────────────
  const removeClip = useCallback(async (index: number) => {
    const updated = await window.electronAPI.trayRemoveClip(index)
    setTrayClips(updated)
    if (updated.length === 0) setTrayOpen(false)
  }, [])

  // ── Clear all clips ───────────────────────────────────────────────────────
  const clearTray = useCallback(async () => {
    await window.electronAPI.trayClear()
    setTrayClips([])
    setTrayOpen(false)
  }, [])

  // ── Core streaming submit ─────────────────────────────────────────────────
  const submitQuery = useCallback(async (message: string): Promise<void> => {
    if (!message || mode === 'thinking' || mode === 'streaming') return

    const historySnapshot: { role: 'user' | 'assistant'; content: string }[] = [
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.text })),
      ...(lastQueryRef.current && rawResponseRef.current ? (() => {
        const { displayText: prevDisplay } = parseActionFromResponse(rawResponseRef.current)
        const prevText = prevDisplay || rawResponseRef.current
        return [
          { role: 'user'      as const, content: lastQueryRef.current },
          { role: 'assistant' as const, content: prevText },
        ]
      })() : []),
    ]

    // Only commit previous exchange if not already committed by the done effect
    if (lastQueryRef.current && rawResponseRef.current) {
      const { displayText: prevDisplay } = parseActionFromResponse(rawResponseRef.current)
      const prevText = prevDisplay || rawResponseRef.current
      setMessages(prev => [
        ...prev,
        { role: 'user'      as const, text: lastQueryRef.current },
        { role: 'assistant' as const, text: prevText },
      ])
    }

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
    setResolvedFiles([])
    setAttachedFiles([])
    setActiveModel(null)

    lastQueryRef.current = message

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

    // Resolve file references from query — silent, capped at 5 s
    // Also merge any manually attached files
    let fileRefs: FileRef[] = [...attachedFiles]
    try {
      const autoRefs = await window.electronAPI.resolveFileRefs({
        query:          message,
        activeFolder:   deriveActiveFolder(context),
        activeFilePath: context?.activeFilePath ?? null,
      })
      // Merge, avoiding duplicates by filePath
      const existingPaths = new Set(fileRefs.map(f => f.filePath))
      fileRefs = [...fileRefs, ...autoRefs.filter(f => !existingPaths.has(f.filePath))]
      if (fileRefs.length > 0) setResolvedFiles(fileRefs)
    } catch { /* non-fatal */ }

    // Vision: send screenshot unless file refs or tray clips already provide
    // structured context. Clipboard is sent separately as clipboardText —
    // the server decides semantically whether it is relevant to this query.
    const useVision = shouldUseVision(
      context?.screenshotBase64 ?? null,
      fileRefs,
      trayClips,
    )

    window.electronAPI.streamContext({
      url: `${WEB_URL}/api/context`,
      token,
      body: {
        message,
        activeApp:        context?.activeApp        ?? null,
        activeFolder:     deriveActiveFolder(context),
        clipboardText:    context?.selectedText     ?? null,   // raw clipboard — server resolves relevance
        screenshotBase64: useVision ? (context?.screenshotBase64 ?? null) : null,
        contextTray:      trayClips.length > 0 ? trayClips : undefined,
        fileRefs:         fileRefs.length > 0 ? fileRefs : undefined,
        history: historySnapshot,
      },
    })
  }, [context, token, mode, messages, trayClips])

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
    setPendingSkill(null)
  }, [pendingSkill, submitQuery])

  // ── Workflow pattern banner handlers ──────────────────────────────────────
  const dismissPattern = useCallback((): void => {
    if (!patternSuggestion) return
    const hash = simpleHash(patternSuggestion.name)
    window.electronAPI.dismissPattern(hash).catch(() => {})
    setPatternDismissed(true)
  }, [patternSuggestion])

  const openSkillFromPattern = useCallback((): void => {
    if (!patternSuggestion) return
    const params = new URLSearchParams({
      name:   patternSuggestion.name,
      prompt: patternSuggestion.suggested_prompt,
    })
    window.electronAPI.openExternal(`${WEB_URL}/dashboard/skills/new?${params.toString()}`)
    setPatternDismissed(true)
  }, [patternSuggestion])

  // ── Palette shown/hidden lifecycle ────────────────────────────────────────
  useEffect(() => {
    const offShown = window.electronAPI.onPaletteShown(() => {
      setVisible(true)
      setQuery('')
      setMode('idle')
      setRawResponse('')
      rawResponseRef.current = ''
      setDisplayText('')
      setPendingAction(null)
      setPendingSkill(null)
      setMessages([])
      conversationCreationRef.current = Promise.resolve(null)
      lastQueryRef.current = ''
      setActionStatus('idle')
      setActionError(null)
      setConfirmed(false)
      setTimeout(() => inputRef.current?.focus(), 60)

      // Re-sync update banner state every time the palette opens. The live
      // 'downloaded' push event can be missed if the renderer wasn't actively
      // processing it at that exact moment — pulling current state here means
      // a missed event self-heals the next time the user opens the palette,
      // instead of waiting for the next 4-hour check cycle.
      window.electronAPI.getUpdaterState().then((ev) => {
        if (ev?.type === 'downloaded') {
          setUpdateVersion((ev.version as string) ?? 'new version')
        }
      })

      // ── Workflow pattern check (1-hour cache) ──────────────────────────
      setPatternDismissed(false)
      const CACHE_TTL = 60 * 60 * 1000 // 1 hour
      const cached = patternCacheRef.current
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        // Use cached result — but still check dismiss state
        if (cached.pattern) {
          const hash = simpleHash(cached.pattern.name)
          window.electronAPI.isPatternDismissed(hash).then(isDismissed => {
            if (!isDismissed) setPatternSuggestion(cached.pattern)
          }).catch(() => {
            setPatternSuggestion(cached.pattern)
          })
        }
      } else {
        // Fire in background — palette opens instantly regardless
        window.electronAPI.apiRequest({
          url:     `${WEB_URL}/api/actions/patterns`,
          method:  'GET',
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => {
          if (res.ok && res.data) {
            const pattern = (res.data as { pattern: typeof patternSuggestion }).pattern ?? null
            patternCacheRef.current = { ts: Date.now(), pattern }
            if (pattern) {
              // Check if user already dismissed this pattern recently
              const hash = simpleHash(pattern.name)
              window.electronAPI.isPatternDismissed(hash).then(isDismissed => {
                if (!isDismissed) setPatternSuggestion(pattern)
              }).catch(() => {
                setPatternSuggestion(pattern)
              })
            }
          }
        }).catch(() => {}) // non-fatal — never break the palette
      }
    })

    const offHidden = window.electronAPI.onPaletteHidden(() => {
      setVisible(false)
      window.electronAPI.cancelStream()
      // Stop any active voice recording
      recognitionRef.current?.stop()
      setIsRecording(false)
      setInterimTranscript('')
    })

    const offContext = window.electronAPI.onContextData((ctx) => {
      setContext(ctx)
    })

    return () => { offShown(); offHidden(); offContext() }
  }, [])

  // ── Stream events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const off = window.electronAPI.onStreamEvent((ev) => {
      if (ev.type === 'chunk') {
        const { text, serverError, model } = parseSSEChunk(ev.data)
        if (model) setActiveModel(model)
        if (serverError) {
          setRawResponse(serverError)
          setMode('error')
        } else if (text) {
          setMode('streaming')
          setRawResponse(prev => prev + text)
        }
      } else if (ev.type === 'done') {
        setMode('done')
      } else if (ev.type === 'auth-error') {
        setRawResponse('Session expired. Please sign in again.')
        setMode('error')
      } else if (ev.type === 'http-error') {
        setRawResponse(`Server error (${ev.status}). Please try again.`)
        setMode('error')
      } else if (ev.type === 'error') {
        setRawResponse('Connection error. Please try again.')
        setMode('error')
      }
    })
    return () => off()
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

  const canAddToTray = !!context?.selectedText?.trim() && !busy

  return (
    <div className={`palette-root ${visible ? 'palette-root--visible' : ''}`}>
      <div className={`palette ${visible ? 'palette--visible' : ''} ${hasResponse || mode === 'thinking' || mode === 'streaming' || trayOpen || showSkillStrip ? 'palette--expanded' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Context strip */}
        {context?.activeApp && (
          <div className="context-strip" style={{ paddingBottom: '0.5rem' }}>
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
                    maxWidth: '260px',
                  }}
                >
                  {deriveActiveFolder(context)}
                </span>
              )}
            </div>
            {context.selectedText && (
              <span className="context-excerpt">
                {context.selectedText.length > 60
                  ? `"${context.selectedText.slice(0, 60)}…"`
                  : `"${context.selectedText}"`}
              </span>
            )}

            {/* Add to tray button — shown only when text is selected */}
            {canAddToTray && (
              <button
                onClick={addToTray}
                title="Pin this selection to the context tray"
                style={{
                  marginLeft: 'auto',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(0, 245, 160, 0.2)',
                  background: 'rgba(0, 245, 160, 0.06)',
                  color: 'rgba(0, 245, 160, 0.7)',
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'background 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <PinIcon />
                Pin
              </button>
            )}

            {/* Tray badge — shown when clips exist */}
            {trayClips.length > 0 && (
              <button
                onClick={() => setTrayOpen(o => !o)}
                title={`${trayClips.length} pinned clip${trayClips.length > 1 ? 's' : ''}`}
                style={{
                  marginLeft: canAddToTray ? '0.3rem' : 'auto',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  border: `1px solid ${trayOpen ? 'rgba(0, 245, 160, 0.35)' : 'rgba(255,255,255,0.12)'}`,
                  background: trayOpen ? 'rgba(0, 245, 160, 0.08)' : 'rgba(255,255,255,0.04)',
                  color: trayOpen ? 'rgba(0, 245, 160, 0.85)' : 'rgba(255,255,255,0.45)',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <PinIcon />
                {trayClips.length}
              </button>
            )}

            <button
              onClick={captureScreenNow}
              disabled={capturingScreen}
              title={
                context?.screenshotBase64
                  ? 'Screen captured — click to refresh'
                  : 'Let Claude see your screen for this query'
              }
              style={{
                marginLeft: trayClips.length > 0 || canAddToTray ? '0.3rem' : 'auto',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
                border: `1px solid ${context?.screenshotBase64 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.12)'}`,
                background: context?.screenshotBase64 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.04)',
                color: context?.screenshotBase64 ? '#f59e0b' : 'rgba(255,255,255,0.45)',
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                cursor: capturingScreen ? 'default' : 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                opacity: capturingScreen ? 0.6 : 1,
              }}
            >
              {capturingScreen
                ? t('palette.vision.reading')
                : context?.screenshotBase64
                  ? t('palette.vision.active')
                  : t('palette.vision.readScreen')}
            </button>

            {autoVision && !context?.screenshotBase64 && (
              <span
                title="Auto screen access is on — screen will be captured automatically"
                style={{
                  marginLeft: '0.3rem',
                  fontSize: '0.6rem',
                  color: 'rgba(245, 158, 11, 0.55)',
                  letterSpacing: '0.02em',
                  flexShrink: 0,
                }}
              >
                auto
              </span>
            )}

            {activeModel && (
              <span
                title={activeModel === 'claude-sonnet-4-6' ? 'Claude Sonnet 4.6 — full power' : 'Claude Haiku 4.5 — fast & efficient'}
                style={{
                  marginLeft: '0.3rem',
                  fontSize: '0.65rem',
                  color: activeModel === 'claude-sonnet-4-6' ? '#10b981' : '#f59e0b',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                }}
              >
                ◉ {activeModel === 'claude-sonnet-4-6' ? 'sonnet 4.6' : 'haiku 4.5'}
              </span>
            )}

            {resolvedFiles.length > 0 && (
              <span
                title={resolvedFiles.map(f => f.fileName).join(', ')}
                style={{
                  marginLeft: '0.3rem',
                  fontSize: '0.65rem',
                  color: '#34d399',
                  letterSpacing: '0.04em',
                  flexShrink: 0,
                  cursor: 'default',
                }}
              >
                ◈ {resolvedFiles.length} file{resolvedFiles.length > 1 ? 's' : ''} found
              </span>
            )}
          </div>
        )}

        {/* ── Scrollable middle zone ─────────────────────────────────────── */}
        {/* Wraps everything between the header and footer so the footer is  */}
        {/* never pushed out of view when the tray panel + skills overflow.  */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ── Context Tray panel ─────────────────────────────────────────── */}
        {trayOpen && trayClips.length > 0 && (
          <div style={{
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}>
            {/* Tray header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.4rem 0.75rem 0.25rem',
            }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Pinned context
              </span>
              <button
                onClick={clearTray}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  padding: '0.1rem 0.3rem',
                  borderRadius: '3px',
                }}
              >
                Clear all
              </button>
            </div>

            {/* Clip list */}
            <div style={{
              maxHeight: '120px',
              overflowY: 'auto',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent',
              padding: '0 0.75rem 0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
            }}>
              {trayClips.map((clip, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    padding: '0.3rem 0.5rem',
                    borderRadius: '5px',
                    border: '1px solid rgba(0, 245, 160, 0.1)',
                    background: 'rgba(0, 245, 160, 0.04)',
                  }}
                >
                  {/* Clip source label + preview */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.6rem',
                      color: 'rgba(0, 245, 160, 0.5)',
                      marginBottom: '0.15rem',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {clipSourceLabel(clip)}
                    </div>
                    <div style={{
                      fontSize: '0.73rem',
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      wordBreak: 'break-word',
                    }}>
                      {clip.text}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeClip(i)}
                    title="Remove this clip"
                    style={{
                      flexShrink: 0,
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.2)',
                      fontSize: '0.8rem',
                      lineHeight: 1,
                      cursor: 'pointer',
                      padding: '0.1rem 0.25rem',
                      borderRadius: '3px',
                      marginTop: '0.05rem',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill button strip */}
        {showSkillStrip && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.375rem',
            padding: '0.5rem 0.75rem',
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
                {skill.is_destructive && <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>⚠</span>}
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
        <div className="input-row" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="input-icon">
            {busy ? <SpinnerIcon /> : <SearchIcon />}
          </span>
          <textarea
            ref={inputRef}
            className="input"
            rows={1}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              // Auto-resize: shrink to auto first, then grow to content
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
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
            style={{ resize: 'none', overflow: 'hidden', maxHeight: '140px' }}
          />
          {query && !busy && <kbd className="input-kbd">↵</kbd>}
          <button
            onClick={pickFile}
            disabled={busy}
            title="Attach file"
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: 'none',
              cursor: busy ? 'default' : 'pointer',
              padding: '0 0.25rem',
              opacity: busy ? 0.3 : 0.8,
              fontSize: '1rem',
              lineHeight: 1,
              color: 'rgba(251, 191, 36, 0.8)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { if (!busy) (e.target as HTMLElement).style.opacity = '1' }}
            onMouseLeave={e => { if (!busy) (e.target as HTMLElement).style.opacity = '0.8' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          {!busy && (
            <button
              onClick={toggleVoice}
              title={isRecording ? t('palette.voiceListening') : t('palette.voiceInput')}
              className={`voice-btn${isRecording ? ' voice-btn--recording' : ''}`}
            >
              {isRecording ? (
                // Stop square — indicates active recording
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" stroke="none"/>
                </svg>
              ) : (
                // Microphone
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5.5" y="1" width="5" height="8" rx="2.5"/>
                  <path d="M2.5 8a5.5 5.5 0 0 0 11 0"/>
                  <line x1="8" y1="13.5" x2="8" y2="15.5"/>
                </svg>
              )}
            </button>
          )}
          {busy && (
            <button
              className="cancel-btn"
              onClick={() => { window.electronAPI.cancelStream(); setMode('idle') }}
            >
              {t('palette.stop')}
            </button>
          )}
        </div>

        {/* Voice interim transcript — live preview while speaking */}
        {interimTranscript && (
          <p className="palette-voice-interim">{interimTranscript}</p>
        )}

        {/* Attached file chips */}
        {attachedFiles.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
            padding: '0.35rem 0.75rem 0.1rem',
          }}>
            {attachedFiles.map((f, i) => (
              <span key={f.filePath} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                background: 'rgba(124, 111, 255, 0.12)',
                border: '1px solid rgba(124, 111, 255, 0.25)',
                fontSize: '0.72rem',
                color: 'rgba(255,255,255,0.9)',
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline',verticalAlign:'middle',marginRight:'3px'}}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>{f.fileName}
                <button
                  onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.7rem',
                    color: '#34d399',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}


        {/* Context hint — shown when idle, no query, no conversation, no selection */}
        {mode === 'idle' && !query && messages.length === 0 && !context?.selectedText && (
          <p style={{
            margin: '0.4rem 0.75rem 0.1rem',
            fontSize: '0.72rem',            
            //color: '#34d3b0',
            color:"#f59e0b",
            lineHeight: 1.5,
          }}>
            {getContextHint(context?.activeApp ?? null, t)}
          </p>
        )}

        {/* Conversation thread */}
        {(messages.length > 0 || hasResponse || mode === 'thinking') && (
          <>
            <div className="divider" />
            <div className="response-area" ref={responseRef}>

              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    marginBottom: '0.5rem',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Wrap bubble + pin button in a column so pin stays inside the flow */}
                  <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '85%', gap: '4px' }}>
                    <p
                      className="response-text"
                      style={{
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
                    {/* Pin button — below each assistant bubble */}
                    {msg.role === 'assistant' && (
                      <button
                        className="pin-btn"
                        title="Pin response"
                        onClick={() => window.electronAPI.pinResponse(msg.text)}
                      >
                        <PinIcon />
                        Pin
                      </button>
                    )}
                  </div>
                </div>
              ))}

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

        {/* ── Workflow pattern suggestion banner ──────────────────────── */}
        {patternSuggestion && !patternDismissed && mode === 'idle' && messages.length === 0 && (
          <div style={{
            margin: '0.5rem 0.75rem 0',
            padding: '0.55rem 0.75rem',
            borderRadius: '7px',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            background: 'rgba(251, 191, 36, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0,
          }}>
            {/* Bulb icon */}
            <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>💡</span>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontSize: '0.72rem',
                color: 'rgba(251, 191, 36, 0.95)',
                fontWeight: 600,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {t('palette.pattern.title', { name: patternSuggestion.name })}
              </p>
              <p style={{
                margin: '0.15rem 0 0',
                fontSize: '0.67rem',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.35,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {patternSuggestion.description}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
              <button
                onClick={openSkillFromPattern}
                style={{
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  background: 'rgba(251, 191, 36, 0.12)',
                  color: 'rgba(251, 191, 36, 0.95)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('palette.pattern.create')}
              </button>
              <button
                onClick={dismissPattern}
                style={{
                  padding: '0.2rem 0.45rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('palette.pattern.dismiss')}
              </button>
            </div>
          </div>
        )}

        {/* Update banner */}
        {updateVersion && !updateDismissed && (
          <div className="update-banner">
            <div className="update-banner__left">
              <span className="update-banner__dot" />
              <span className="update-banner__text">
                {t('palette.update.label')}{' '}
                <span className="update-banner__version">v{updateVersion}</span>{' '}
                {t('palette.update.ready')}
              </span>
            </div>
            <div className="update-banner__actions">
              <button
                className="update-banner__btn-install"
                onClick={() => window.electronAPI.updaterInstall()}
              >
                {t('palette.update.restart')}
              </button>
              <button
                className="update-banner__btn-later"
                onClick={() => setUpdateDismissed(true)}
              >
                {t('palette.update.later')}
              </button>
            </div>
          </div>
        )}

        {/* ── End scrollable middle zone ──────────────────────────────────── */}
        </div>

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
            <button
              className="footer-btn"
              title="Click to change the global hotkey"
              style={{
                opacity:     recordingHotkey ? 1 : 0.55,
                fontSize:    '0.65rem',
                fontFamily:  'monospace',
                color:       hotkeySaved
                  ? 'rgba(0, 245, 160, 0.9)'
                  : recordingHotkey
                    ? 'rgba(251, 191, 36, 0.95)'
                    : undefined,
                border:      recordingHotkey ? '1px solid rgba(251,191,36,0.4)' : undefined,
                minWidth:    '5rem',
                transition:  'color 0.15s, border 0.15s',
              }}
              onClick={() => {
                setHotkeyPreview(null)
                setRecordingHotkey(true)
              }}
            >
              {hotkeySaved
                ? '✓ saved'
                : recordingHotkey
                  ? (hotkeyPreview ? acceleratorToDisplay(hotkeyPreview) : 'press keys…')
                  : acceleratorToDisplay(hotkey)}
            </button>
            <button className="footer-btn" onClick={() => window.electronAPI.openDashboard()}>
              {t('palette.footer.dashboard')}
            </button>
            <button
              className="footer-btn"
              title={
                autoVision
                  ? t('palette.vision.autoTitleOn')
                  : t('palette.vision.autoTitleOff')
              }
              style={{
                color: autoVision ? 'rgba(245, 158, 11, 0.9)' : undefined,
              }}
              onClick={toggleAutoVision}
            >
              {autoVision ? t('palette.vision.autoOn') : t('palette.vision.autoOff')}
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
