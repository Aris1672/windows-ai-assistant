'use client'

// All data operations go through our own Vercel API route.
// Traffic path: browser → Vercel (/api/actions) → Supabase  ✓
// supabase-browser is NOT imported here.

import { useEffect, useState } from 'react'
import { Monitor, Search, CheckCircle, XCircle, Clock } from 'lucide-react'

type Action = {
  id: string
  action_label: string
  context_app: string | null
  status: string
  created_at: string
}

const STATUS_OPTIONS = ['all', 'done', 'error', 'pending'] as const

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string; Icon: typeof CheckCircle }> = {
    done:    { label: 'Done',    color: 'var(--accent)',     bg: 'var(--accent-dim)',     border: 'var(--accent-border)',  Icon: CheckCircle },
    error:   { label: 'Error',   color: 'var(--error)',      bg: 'rgba(255,82,82,0.08)', border: 'rgba(255,82,82,0.2)',   Icon: XCircle     },
    pending: { label: 'Pending', color: 'var(--text-muted)', bg: 'var(--surface-2)',     border: 'var(--border)',         Icon: Clock       },
  }
  const { label, color, bg, border, Icon } = map[status] ?? map.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.72rem', fontWeight: 500, color, background: bg,
      border: `1px solid ${border}`, borderRadius: '4px', padding: '0.15rem 0.5rem',
      flexShrink: 0,
    }}>
      <Icon size={10} /> {label}
    </span>
  )
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)     return 'just now'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function HistoryPage() {
  const [actions, setActions]           = useState<Action[]>([])
  const [total, setTotal]               = useState(0)
  const [offset, setOffset]             = useState(0)
  const [loading, setLoading]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [search, setSearch]             = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setActiveSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset and refetch whenever filters change
  useEffect(() => {
    setLoading(true)
    fetchActions(0, true).finally(() => setLoading(false))
  }, [activeSearch, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchActions(fromOffset: number, reset: boolean) {
    const params = new URLSearchParams({
      offset: String(fromOffset),
      status: statusFilter,
      search: activeSearch.trim(),
    })

    const res = await fetch(`/api/actions?${params}`, { credentials: 'include' })
    const { data, count } = await res.json() as { data: Action[]; count: number }

    if (reset) {
      setActions(data)
      setOffset(data.length)
    } else {
      setActions(prev => [...prev, ...data])
      setOffset(prev => prev + data.length)
    }
    setTotal(count)
  }

  async function loadMore() {
    setLoadingMore(true)
    await fetchActions(offset, false)
    setLoadingMore(false)
  }

  const hasMore = actions.length < total

  return (
    <div style={{ padding: '2.5rem', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
          History
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Every action run from the desktop app.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <Search size={13} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            placeholder="Search actions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>

        {/* Status pills */}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '6px',
                border: `1px solid ${statusFilter === s ? 'var(--accent-border)' : 'var(--border)'}`,
                background: statusFilter === s ? 'var(--accent-dim)' : 'var(--surface-1)',
                color: statusFilter === s ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: statusFilter === s ? 500 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Total count */}
        {!loading && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {total.toLocaleString()} {total === 1 ? 'action' : 'actions'}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>

      ) : actions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            {search || statusFilter !== 'all'
              ? 'No actions match your filters.'
              : 'No actions yet.'}
          </p>
          {!search && statusFilter === 'all' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Press{' '}
              <kbd style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                Ctrl + Space
              </kbd>{' '}
              in the desktop app to get started.
            </p>
          )}
        </div>

      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {actions.map((action, i) => (
              <div
                key={action.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: i < actions.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Label + app */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {action.action_label}
                  </div>
                  {action.context_app && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Monitor size={10} /> {action.context_app}
                    </div>
                  )}
                </div>

                {/* Status */}
                <StatusBadge status={action.status} />

                {/* Time */}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '72px', textAlign: 'right', flexShrink: 0 }}>
                  {relativeTime(action.created_at)}
                </span>
              </div>
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                className="btn-ghost"
                style={{ width: 'auto' }}
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : `Load more · ${(total - actions.length).toLocaleString()} remaining`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
