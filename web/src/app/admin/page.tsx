import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { Users, Zap, BookOpen, Activity, ArrowRight, Shield, User } from 'lucide-react'

export default async function AdminOverviewPage() {
  const admin = createAdminClient()

  const [
    { count: userCount },
    { count: actionCount },
    { count: skillCount },
    { count: instructionCount },
    { data: recentUsers },
    { data: recentActions },
  ] = await Promise.all([
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin.from('actions').select('*', { count: 'exact', head: true }),
    admin.from('skills').select('*', { count: 'exact', head: true }),
    admin.from('instructions').select('*', { count: 'exact', head: true }),
    admin.from('users')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('actions')
      .select('id, action_label, context_app, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const statCards = [
    { label: 'Total users',       value: userCount ?? 0,        icon: Users,     href: '/admin/users',     color: 'var(--accent)' },
    { label: 'Total actions',     value: actionCount ?? 0,      icon: Activity,  href: '/admin/analytics', color: '#60A5FA'       },
    { label: 'Skills created',    value: skillCount ?? 0,       icon: Zap,       href: '/admin/analytics', color: '#A78BFA'       },
    { label: 'Instructions set',  value: instructionCount ?? 0, icon: BookOpen,  href: '/admin/analytics', color: '#34D399'       },
  ]

  return (
    <div style={{ padding: '2.5rem', maxWidth: '960px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
          Admin Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Platform-wide stats and recent activity.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {statCards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <div
              className="card"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
              onMouseEnter={undefined}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} strokeWidth={1.8} style={{ color }} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '0.25rem' }}>
                  {value.toLocaleString()}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two-column: recent signups + recent actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Recent signups */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Recent signups
            </h2>
            <Link href="/admin/users" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              All users <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {(recentUsers ?? []).length === 0 ? (
              <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No users yet.</div>
            ) : (recentUsers ?? []).map((u, i) => (
              <div key={u.id} style={{ padding: '0.75rem 1.25rem', borderBottom: i < (recentUsers ?? []).length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {u.role === 'administrator'
                      ? <Shield size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      : <User size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    }
                    {u.email}
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {new Date(u.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent actions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Recent actions
            </h2>
            <Link href="/admin/analytics" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Analytics <ArrowRight size={12} />
            </Link>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {(recentActions ?? []).length === 0 ? (
              <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No actions yet.</div>
            ) : (recentActions ?? []).map((a, i) => (
              <div key={a.id} style={{ padding: '0.75rem 1.25rem', borderBottom: i < (recentActions ?? []).length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>
                  {a.action_label}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${a.status === 'done' ? 'badge-accent' : 'badge-muted'}`}>{a.status}</span>
                  {a.context_app && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.context_app}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
