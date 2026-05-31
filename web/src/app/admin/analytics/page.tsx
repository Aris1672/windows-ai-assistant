import { createAdminClient } from '@/lib/supabase'
import { Activity, Monitor, CheckCircle, XCircle, Clock } from 'lucide-react'

function pct(n: number, total: number) {
  if (!total) return 0
  return Math.round((n / total) * 100)
}

export default async function AnalyticsPage() {
  const admin = createAdminClient()

  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const since7d  = new Date(Date.now() -  7 * 86_400_000).toISOString()

  const [
    { data: actions30d },
    { count: usersThisWeek },
    { count: totalUsers },
  ] = await Promise.all([
    admin
      .from('actions')
      .select('status, context_app, action_type, created_at')
      .gte('created_at', since30d)
      .order('created_at', { ascending: true }),
    admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', since7d),
    admin.from('users').select('*', { count: 'exact', head: true }),
  ])

  const rows = actions30d ?? []

  // ── Aggregate by status ──────────────────────────────────────────────────────
  const byStatus: Record<string, number> = {}
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  }
  const totalActions = rows.length

  // ── Aggregate by day (last 14 days for chart) ────────────────────────────────
  const since14d = new Date(Date.now() - 14 * 86_400_000).toISOString()
  const byDay: Record<string, number> = {}
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    byDay[d.toISOString().slice(0, 10)] = 0
  }
  for (const r of rows) {
    if (r.created_at >= since14d) {
      const day = r.created_at.slice(0, 10)
      if (day in byDay) byDay[day] = (byDay[day] ?? 0) + 1
    }
  }
  const dayMax = Math.max(...Object.values(byDay), 1)

  // ── Aggregate by app ────────────────────────────────────────────────────────
  const byApp: Record<string, number> = {}
  for (const r of rows) {
    if (r.context_app) byApp[r.context_app] = (byApp[r.context_app] ?? 0) + 1
  }
  const topApps = Object.entries(byApp)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  // ── Aggregate by action_type ────────────────────────────────────────────────
  const byType: Record<string, number> = {}
  for (const r of rows) {
    if (r.action_type) byType[r.action_type] = (byType[r.action_type] ?? 0) + 1
  }
  const topTypes = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    done:    { label: 'Done',    color: 'var(--accent)', icon: CheckCircle },
    error:   { label: 'Error',   color: 'var(--error)',  icon: XCircle     },
    pending: { label: 'Pending', color: '#60A5FA',       icon: Clock       },
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '960px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
          Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Usage stats for the last 30 days.
        </p>
      </div>

      {/* Top row: summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Actions (30d)',   value: totalActions.toLocaleString(),      color: 'var(--accent)', icon: Activity  },
          { label: 'New users (7d)',  value: (usersThisWeek ?? 0).toLocaleString(), color: '#A78BFA',  icon: Activity  },
          { label: 'Total users',     value: (totalUsers ?? 0).toLocaleString(),    color: '#60A5FA',  icon: Activity  },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={16} strokeWidth={1.8} style={{ color }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '0.2rem' }}>
                {value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions per day bar chart */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Actions per day — last 14 days
        </h2>
        {totalActions === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
            {Object.entries(byDay).map(([day, count]) => (
              <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div
                  title={`${day}: ${count}`}
                  style={{
                    width: '100%',
                    height: `${Math.max((count / dayMax) * 64, count > 0 ? 4 : 0)}px`,
                    background: count > 0 ? 'var(--accent)' : 'var(--surface-3)',
                    borderRadius: '3px 3px 0 0',
                    opacity: count > 0 ? 0.85 : 0.3,
                    transition: 'opacity 0.15s',
                    cursor: 'default',
                  }}
                />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                  {new Date(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom row: status breakdown + top apps */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Status breakdown */}
        <div className="card">
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Actions by status
          </h2>
          {totalActions === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                const cfg = statusConfig[status] ?? { label: status, color: 'var(--text-muted)', icon: Clock }
                const Icon = cfg.icon
                return (
                  <div key={status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Icon size={12} style={{ color: cfg.color }} /> {cfg.label}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {count.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>({pct(count, totalActions)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct(count, totalActions)}%`, background: cfg.color, borderRadius: '2px', opacity: 0.8 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top apps */}
        <div className="card">
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Top apps
          </h2>
          {topApps.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No context app data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {topApps.map(([app, count]) => (
                <div key={app}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Monitor size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> {app}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0, marginLeft: '0.5rem' }}>
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: '3px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct(count, topApps[0][1])}%`, background: '#60A5FA', borderRadius: '2px', opacity: 0.7 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Top action types */}
      {topTypes.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Top action types
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {topTypes.map(([type, count]) => (
              <span key={type} className="badge badge-muted" style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}>
                {type} <span style={{ opacity: 0.6, marginLeft: '0.375rem' }}>{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
