/**
 * app/src/renderer/src/components/CommandPalette.tsx
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ContextBundle, Action } from '../types/electron'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://your-app.vercel.app'

type Mode = 'idle' | 'thinking' | 'streaming' | 'done' | 'error'

interface CommandPaletteProps {
  token: string
  onLogout: () => void
}

// ─── Action metadata (mirrors main/actions.ts — keep in sync) ────────────────

const ACTION_REQUIRES_CONFIRM: Record<Action['type'], boolean> = {
  insert_text:       true,
  copy_to_clipboard: false,
  open_folder:       false,
  open_file:         false,
  open_url:          false,
}

const ACTION_LABELS: Record<Action['type'], string> = {
  insert_text:       'Insert text',
  copy_to_clipboard: 'Copy to clipboard',
  open_folder:       'Open folder',
  open_file:         'Open file',
  open_url:          'Open URL',
}

// ─── Action XML parser ────────────────────────────────────────────────────────
// The AI appends <action type="...">...</action> at the end of its response.
// We strip it from the displayed text and surface it as a button.

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

/**
 * Strips the <action> block from text for live display during streaming.
 * Claude always places the action at the very end, so we cut from <action onwards.
 * Using a greedy [\s\S]* so a partially-streamed opening tag is also removed.
 */
function stripActionTagLive(text: string): string {
  return text.replace(/<action[\s\S]*$/, '').trim()
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon(): JSX.Element {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path
        d="M6 1a5 5 0 100 10A5 5 0 006 1zM0 6a6 6 0 1110.89 3.477l3.817 3.816a.75.75 0 01-1.06 1.061l-3.817-3.816A6 6 0 010 6z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandPalette({ token, onLogout }: CommandPaletteProps): JSX.Element {
  const [query, setQuery]       = useState('')
  const [context, setContext]   = useState<ContextBundle | null>(null)
  const [rawResponse, setRawResponse] = useState('')  // full text inc. <action> tag
  const [mode, setMode]         = useState<Mode>('idle')
  const [visible, setVisible]   = useState(false)

  // Action state
  const [pendingAction, setPendingAction] = useState<Action | null>(null)
  const [displayText, setDisplayText]     = useState('')
  const [actionStatus, setActionStatus]   = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [actionError, setActionError]     = useState<string | null>(null)
  const [confirmed, setConfirmed]         = useState(false)

  const inputRef    = useRef<HTMLInputElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  // ── Parse action once streaming finishes ──────────────────────────────────
  useEffect(() => {
    if (mode !== 'done' && mode !== 'error') return

    const { displayText: dt, action } = parseActionFromResponse(rawResponse)
    setDisplayText(dt)
    setPendingAction(action)
    setActionStatus('idle')
    setActionError(null)
    setConfirmed(false)

    // Auto-execute safe (non-confirm) actions immediately
    if (action && !ACTION_REQUIRES_CONFIRM[action.type]) {
      runAction(action)
    }
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Execute action ────────────────────────────────────────────────────────
  const runAction = useCallback(async (action: Action) => {
    setActionStatus('running')
    const result = await window.electronAPI.executeAction(action)
    if (result.ok) {
      setActionStatus('done')
      setPendingAction(null)
    } else {
      setActionStatus('error')
      setActionError(result.error ?? 'Action failed')
    }
  }, [])

  // ── Stream event listener ─────────────────────────────────────────────────
  useEffect(() => {
    const off = window.electronAPI.onStreamEvent((ev) => {
      switch (ev.type) {
        case 'auth-error':
          onLogout()
          break
        case 'http-error':
          setMode('error')
          setRawResponse(`Something went wrong — please try again. (HTTP ${ev.status})`)
          break
        case 'error':
          setMode('error')
          setRawResponse('Something went wrong — please try again.')
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
  }, [onLogout])

  // ── IPC listeners ──────────────────────────────────────────────────────────
  useEffect(() => {
    const offShown = window.electronAPI.onPaletteShown(() => {
      setVisible(true)
      setQuery('')
      setRawResponse('')
      setDisplayText('')
      setMode('idle')
      setPendingAction(null)
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
        if (mode === 'thinking' || mode === 'streaming') {
          window.electronAPI.cancelStream()
          setMode('idle')
        } else {
          window.electronAPI.hidePalette()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode])

  // ── Auto-scroll response ───────────────────────────────────────────────────
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [displayText, rawResponse])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = useCallback((): void => {
    const q = query.trim()
    if (!q || mode === 'thinking' || mode === 'streaming') return

    setMode('thinking')
    setRawResponse('')
    setDisplayText('')
    setPendingAction(null)
    setActionStatus('idle')
    setActionError(null)
    setConfirmed(false)

    const activeFolder = context?.activeFilePath
      ? (context.activeFilePath.replace(/[/\\][^/\\]+$/, '') || null)
      : null

    window.electronAPI.streamContext({
      url: `${WEB_URL}/api/context`,
      token,
      body: {
        message: q,
        activeApp:    context?.activeApp    ?? null,
        activeFolder,
        selectedText: context?.selectedText ?? null,
        history: []
      }
    })
  }, [query, context, token, mode])

  // ─── Render ───────────────────────────────────────────────────────────────

  const busy        = mode === 'thinking' || mode === 'streaming'
  // While streaming, strip the trailing <action> block in real-time so
  // the user never sees raw XML. Once done, displayText is already stripped.
  const shownText   = (mode === 'streaming') ? stripActionTagLive(rawResponse) : displayText
  const hasResponse = shownText.length > 0

  // Action button state
  const needsConfirm    = pendingAction ? ACTION_REQUIRES_CONFIRM[pendingAction.type] : false
  const showActionBtn   = pendingAction !== null && actionStatus !== 'done' && mode !== 'error'
  const actionLabel     = pendingAction ? ACTION_LABELS[pendingAction.type] : ''
  const actionIsRunning = actionStatus === 'running'

  return (
    <div className={`palette-root ${visible ? 'palette-root--visible' : ''}`}>
      <div className={`palette ${visible ? 'palette--visible' : ''}`}>

        {/* Context strip */}
        {context?.activeApp && (
          <div className="context-strip">
            <span className="context-app">{context.activeApp}</span>
            {context.selectedText && (
              <span className="context-excerpt">
                {context.selectedText.length > 72
                  ? `"${context.selectedText.slice(0, 72)}…"`
                  : `"${context.selectedText}"`}
              </span>
            )}
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
                submit()
              }
            }}
            placeholder="Ask anything…"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
          />
          {query && !busy && <kbd className="input-kbd">↵</kbd>}
          {busy && (
            <button
              className="cancel-btn"
              onClick={() => {
                window.electronAPI.cancelStream()
                setMode('idle')
              }}
            >
              Stop
            </button>
          )}
        </div>

        {/* Divider */}
        {(hasResponse || mode === 'thinking') && <div className="divider" />}

        {/* Response area */}
        {(hasResponse || mode === 'thinking') && (
          <div className="response-area" ref={responseRef}>
            {mode === 'thinking' && !hasResponse && (
              <div className="thinking-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            )}
            {hasResponse && mode !== 'error' && (
              <p className="response-text">
                {shownText}
                {mode === 'streaming' && <span className="caret" />}
              </p>
            )}
            {mode === 'error' && (
              <p className="response-text response-text--error">{shownText || rawResponse}</p>
            )}

            {/* Action button */}
            {showActionBtn && (
              <div className="action-row">
                {actionStatus === 'error' && actionError && (
                  <span className="action-error">{actionError}</span>
                )}

                {needsConfirm && !confirmed ? (
                  // Destructive — show confirm prompt first
                  <div className="action-confirm">
                    <span className="action-confirm-label">
                      Run: <strong>{actionLabel}</strong>?
                    </span>
                    <button
                      className="action-btn action-btn--confirm"
                      onClick={() => {
                        setConfirmed(true)
                        runAction(pendingAction!)
                      }}
                      disabled={actionIsRunning}
                    >
                      {actionIsRunning ? 'Running…' : 'Confirm ↵'}
                    </button>
                    <button
                      className="action-btn action-btn--cancel"
                      onClick={() => setPendingAction(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : needsConfirm && confirmed ? (
                  // Confirmed, waiting for result
                  <div className="action-running">
                    <SpinnerIcon />
                    <span>{actionLabel}…</span>
                  </div>
                ) : (
                  // Safe action — show status while auto-executing
                  <div className="action-running">
                    {actionIsRunning && <><SpinnerIcon /><span>{actionLabel}…</span></>}
                  </div>
                )}
              </div>
            )}

            {/* Action done feedback */}
            {actionStatus === 'done' && (
              <p className="action-done">✓ Done</p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="palette-footer">
          <span className="footer-esc">{busy ? 'Esc to stop' : 'Esc to close'}</span>
          <div className="footer-actions">
            <button className="footer-btn" onClick={() => window.electronAPI.openDashboard()}>
              Dashboard ↗
            </button>
            <button className="footer-btn footer-btn--danger" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
