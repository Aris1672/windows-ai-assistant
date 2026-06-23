'use client'

/**
 * web/src/app/dashboard/integrations/page.tsx
 *
 * Integrations page — lets users connect calendars via private iCal URL.
 * Works with Google Calendar, Apple Calendar, Outlook, Yandex, and any iCal source.
 */

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Integration {
  service:    string
  scope:      string | null
  created_at: string
  updated_at: string
}

// ─── Service registry — add more here as integrations are added ───────────────

const SERVICES: {
  key:         string
  label:       string
  icon:        string
  description: string
  howTo:       React.ReactNode
}[] = [
  {
    key:         'ical',
    label:       'Calendar (iCal)',
    icon:        '📅',
    description: 'Ask the AI about tomorrow\'s meetings, today\'s schedule, or upcoming events — results appear directly in the response without opening the browser.',
    howTo: (
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text)' }}>How to get your private iCal URL:</strong>
        <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span>• <strong>Google Calendar:</strong> Settings → find your calendar → "Интеграция календаря" → copy "Закрытый адрес в формате iCal"</span>
          <span>• <strong>Outlook:</strong> Calendar → Settings → Shared calendars → copy the ICS link</span>
          <span>• <strong>Apple Calendar:</strong> Right-click calendar → Get Info → copy the URL</span>
          <span>• <strong>Yandex Calendar:</strong> Settings → Sync → iCal URL</span>
        </div>
        <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(255,200,0,0.07)', border: '1px solid rgba(255,200,0,0.2)', borderRadius: '6px' }}>
          ⚠️ This URL gives access to all your calendar events — treat it like a password and don't share it.
        </div>
      </div>
    ),
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [integrations,  setIntegrations]  = useState<Integration[]>([])
  const [loading,       setLoading]       = useState(true)
  const [connecting,    setConnecting]    = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [banner, setBanner]              = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Per-service URL input state
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({})
  const [showForm,  setShowForm]  = useState<string | null>(null)

  const fetchIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/integrations')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load')
      setIntegrations(Array.isArray(json) ? json : (json.data ?? []))
    } catch (e) {
      setBanner({ type: 'error', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchIntegrations() }, [fetchIntegrations])

  async function connect(service: string) {
    const url = urlInputs[service]?.trim()
    if (!url) return

    setConnecting(service)
    setBanner(null)
    try {
      const res  = await fetch('/api/integrations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ service, url }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to connect')

      await fetchIntegrations()
      setShowForm(null)
      setUrlInputs(prev => ({ ...prev, [service]: '' }))
      setBanner({ type: 'success', message: `${SERVICES.find(s => s.key === service)?.label} connected.` })
    } catch (e) {
      setBanner({ type: 'error', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setConnecting(null)
    }
  }

  async function disconnect(service: string) {
    setDisconnecting(service)
    setBanner(null)
    try {
      const res  = await fetch(`/api/integrations?service=${service}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to disconnect')

      setIntegrations(prev => prev.filter(i => i.service !== service))
      setBanner({ type: 'success', message: `${SERVICES.find(s => s.key === service)?.label} disconnected.` })
    } catch (e) {
      setBanner({ type: 'error', message: e instanceof Error ? e.message : 'Unknown error' })
    } finally {
      setDisconnecting(null)
    }
  }

  const connectedSet = new Set(integrations.map(i => i.service))

  return (
    <div style={{ padding: '2rem', maxWidth: '680px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.35rem' }}>
          Integrations
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          Connect external services so the AI can read your data directly — no copy-pasting, no browser required.
        </p>
      </div>

      {/* Banner */}
      {banner && (
        <div style={{
          padding:      '0.65rem 1rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          fontSize:     '0.8rem',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          gap:          '8px',
          background:   banner.type === 'success' ? 'rgba(34,197,94,0.1)'        : 'rgba(239,68,68,0.1)',
          border:       banner.type === 'success' ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
          color:        banner.type === 'success' ? '#4ade80' : 'var(--error, #f87171)',
        }}>
          <span>{banner.message}</span>
          <button onClick={() => setBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '14px' }}>✕</button>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {SERVICES.map(svc => {
            const integration = integrations.find(i => i.service === svc.key)
            const isConnected = connectedSet.has(svc.key)
            const isExpanded  = showForm === svc.key

            return (
              <div key={svc.key} style={{
                background:   'var(--bg-2, #1a1a1a)',
                border:       `1px solid ${isConnected ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--border, #2a2a2a)'}`,
                borderRadius: '12px',
                overflow:     'hidden',
                transition:   'border-color 0.2s',
              }}>

                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '18px 20px' }}>

                  {/* Icon */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: 'var(--bg-3, #242424)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', flexShrink: 0,
                  }}>
                    {svc.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{svc.label}</span>
                      {isConnected && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 600,
                          padding: '2px 7px', borderRadius: '999px',
                          background: 'rgba(34,197,94,0.12)', color: '#4ade80',
                          border: '1px solid rgba(34,197,94,0.25)',
                        }}>
                          Connected
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
                      {svc.description}
                    </p>
                    {integration && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Connected {formatDate(integration.created_at)}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <div style={{ flexShrink: 0 }}>
                    {isConnected ? (
                      <button
                        onClick={() => disconnect(svc.key)}
                        disabled={!!disconnecting}
                        style={{
                          padding: '6px 14px', borderRadius: '7px',
                          border: '1px solid var(--border, #2a2a2a)',
                          background: 'transparent', color: 'var(--text-muted)',
                          fontSize: '0.8rem',
                          cursor: disconnecting === svc.key ? 'not-allowed' : 'pointer',
                          opacity: disconnecting === svc.key ? 0.5 : 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {disconnecting === svc.key ? 'Removing…' : 'Disconnect'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowForm(isExpanded ? null : svc.key)}
                        style={{
                          padding: '6px 14px', borderRadius: '7px', border: 'none',
                          background: 'var(--accent, #00c9a0)', color: 'var(--bg, #141414)',
                          fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isExpanded ? 'Cancel' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Connect form — shown when expanded and not connected */}
                {isExpanded && !isConnected && (
                  <div style={{
                    borderTop: '1px solid var(--border, #2a2a2a)',
                    padding: '16px 20px',
                    background: 'var(--bg, #141414)',
                    display: 'flex', flexDirection: 'column', gap: '14px',
                  }}>

                    {/* How-to instructions */}
                    {svc.howTo}

                    {/* URL input */}
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.03em' }}>
                        PRIVATE ICAL URL
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="url"
                          placeholder="https://calendar.google.com/calendar/ical/…"
                          value={urlInputs[svc.key] ?? ''}
                          onChange={(e) => setUrlInputs(prev => ({ ...prev, [svc.key]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') connect(svc.key) }}
                          style={{
                            flex: 1,
                            background: 'var(--bg-2, #1a1a1a)',
                            border: '1px solid var(--border, #2a2a2a)',
                            borderRadius: '7px',
                            padding: '8px 12px',
                            color: 'var(--text)',
                            fontSize: '0.8rem',
                            outline: 'none',
                            fontFamily: 'monospace',
                          }}
                        />
                        <button
                          onClick={() => connect(svc.key)}
                          disabled={!urlInputs[svc.key]?.trim() || connecting === svc.key}
                          style={{
                            padding: '8px 16px', borderRadius: '7px', border: 'none',
                            background: 'var(--accent, #00c9a0)', color: 'var(--bg, #141414)',
                            fontWeight: 700, fontSize: '0.8rem',
                            cursor: !urlInputs[svc.key]?.trim() || connecting === svc.key ? 'not-allowed' : 'pointer',
                            opacity: !urlInputs[svc.key]?.trim() || connecting === svc.key ? 0.5 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {connecting === svc.key ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
