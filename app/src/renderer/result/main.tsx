/**
 * app/src/renderer/result/main.tsx
 * Entry point — paste this file at that path and import from result.html
 */

import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultPayload {
  title:   string
  content: string
}

declare global {
  interface Window {
    resultAPI: {
      onPayload:    (cb: (p: ResultPayload) => void) => () => void
      close:        () => void
      openExternal: (url: string) => void
    }
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = `
  :root {
    --bg:           #1a1a1a;
    --bg-2:         #242424;
    --bg-3:         #2e2e2e;
    --border:       #333;
    --text:         #e8e8e8;
    --text-muted:   #888;
    --accent:       #7c6af7;
    --accent-hover: #6a59e0;
    --radius:       10px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body, #root {
    height: 100%;
    font-family: -apple-system, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: var(--text);
    background: var(--bg);
  }

  .window {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  }

  /* Draggable title bar */
  .titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--bg-2);
    border-bottom: 1px solid var(--border);
    -webkit-app-region: drag;
    flex-shrink: 0;
  }

  .titlebar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .skill-icon {
    width: 22px;
    height: 22px;
    background: var(--accent);
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 12px;
  }

  .title {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text);
  }

  .titlebar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    -webkit-app-region: no-drag;
    flex-shrink: 0;
  }

  .btn {
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg-3);
    color: var(--text);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn:hover { background: #383838; }

  .btn-close {
    width: 26px;
    height: 26px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    color: var(--text-muted);
  }

  .btn-close:hover { color: var(--text); }

  .btn-copy.copied {
    color: #6ecf6e;
    border-color: #6ecf6e44;
  }

  /* Content area */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    line-height: 1.65;
    color: var(--text);
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }

  .content::-webkit-scrollbar       { width: 6px; }
  .content::-webkit-scrollbar-track { background: transparent; }
  .content::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  /* Footer */
  .footer {
    padding: 8px 14px;
    background: var(--bg-2);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .timestamp {
    font-size: 11px;
    color: var(--text-muted);
  }

  /* Empty state */
  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 13px;
  }
`

// ─── Component ────────────────────────────────────────────────────────────────

function ResultApp() {
  const [payload, setPayload] = useState<ResultPayload | null>(null)
  const [copied,  setCopied]  = useState(false)
  const [time,    setTime]    = useState(new Date())

  useEffect(() => {
    const unsub = window.resultAPI.onPayload((p) => {
      setPayload(p)
      setTime(new Date())
      setCopied(false)
    })
    return unsub
  }, [])

  function handleCopy() {
    if (!payload) return
    navigator.clipboard.writeText(payload.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleClose() {
    window.resultAPI.close()
  }

  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <style>{styles}</style>
      <div className="window">
        {/* Title bar */}
        <div className="titlebar">
          <div className="titlebar-left">
            <div className="skill-icon">⚡</div>
            <span className="title">{payload?.title ?? 'Skill Result'}</span>
          </div>
          <div className="titlebar-actions">
            <button
              className={`btn btn-copy${copied ? ' copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button className="btn btn-close" onClick={handleClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        {payload
          ? <div className="content">{payload.content}</div>
          : <div className="empty">Waiting for result…</div>
        }

        {/* Footer */}
        {payload && (
          <div className="footer">
            <span className="timestamp">Ran at {formattedTime}</span>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Mount ────────────────────────────────────────────────────────────────────

const root = document.getElementById('root')!
createRoot(root).render(<ResultApp />)
