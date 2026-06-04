// web/src/app/admin/billing/page.tsx

import { createAdminClient } from '@/lib/supabase'
import Link from 'next/link'
import { Users, DollarSign, Zap, TrendingUp, ArrowRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysLeft(dateString: string | null): number | null {
  if (!dateString) return null
  const end = new Date(dateString)
  const now = new Date()
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return days < 0 ? 0 : days
}

function StatusBadge({ status, daysLeft }: { status: string; daysLeft: number | null }) {
  const configs: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
    trial:     { label: 'Trial',     color: '#F59E0B', bg: '#F59E0B18', icon: Clock        },
    active:    { label: 'Active',    color: '#34D399', bg: '#34D39918', icon: CheckCircle  },
    expired:   { label: 'Expired',   color: '#F87171', bg: '#F8717118', icon: XCircle      },
    cancelled: { label: 'Cancelled', color: '#94A3B8', bg: '#94A3B818', icon: AlertCircle  },
  }
  const cfg = configs[status] ?? configs.expired
  const Icon = cfg.icon

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.55rem', borderRadius: '6px',
      background: cfg.bg, border: `1px solid ${cfg.color}30`,
      fontSize: '0.75rem', fontWeight: 600, color: cfg.color,
    }}>
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
      {daysLeft !== null && daysLeft > 0 && (
        <span style={{ opacity: 0.75, fontWeight: 400 }}>· {daysLeft}d</span>
      )}
    </span>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminBillingPage() {
  const admin = createAdminClient()

  // Fetch all users with billing fields
  const { data: users } = await admin
    .from('users')
    .select('id, email, subscription_status, trial_ended_at, subscription_ends_at, tokens_used_this_month, estimated_cost_usd, created_at')
    .order('tokens_used_this_month', { ascending: false })

  // Fetch recent billing records
  const { data: billingRecords } = await admin
    .from('billing_records')
    .select('id, user_id, amount_usd, payment_date, status, notes')
    .order('payment_date', { ascending: false })
    .limit(10)

  // Fetch top token users this month (last 30 days from token_usage)
  const { data: topTokenUsers } = await admin
    .from('token_usage')
    .select('user_id, total_tokens, cost_usd, action_type, created_at')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const allUsers = users ?? []
  const trialUsers    = allUsers.filter(u => u.subscription_status === 'trial')
  const activeUsers   = allUsers.filter(u => u.subscription_status === 'active')
  const expiredUsers  = allUsers.filter(u => u.subscription_status === 'expired')

  const totalTokenCostUsd  = allUsers.reduce((sum, u) => sum + (u.estimated_cost_usd ?? 0), 0)
  const monthlyRevenueEur  = activeUsers.length * 19.90
  const avgCostPerUser     = allUsers.length > 0 ? totalTokenCostUsd / allUsers.length : 0

  // Build email lookup for billing records
  const userEmailMap = Object.fromEntries(allUsers.map(u => [u.id, u.email]))

  // Token usage stats
  const tokenRows = topTokenUsers ?? []
  const totalTokensThisMonth = tokenRows.reduce((sum, r) => sum + (r.total_tokens ?? 0), 0)

  const statCards = [
    {
      label: 'Monthly revenue',
      value: `€${monthlyRevenueEur.toFixed(2)}`,
      sub: `${activeUsers.length} active subscriber${activeUsers.length !== 1 ? 's' : ''}`,
      icon: DollarSign,
      color: '#34D399',
    },
    {
      label: 'Token cost (all time)',
      value: `$${totalTokenCostUsd.toFixed(3)}`,
      sub: `Avg $${avgCostPerUser.toFixed(3)}/user`,
      icon: Zap,
      color: '#F59E0B',
    },
    {
      label: 'Tokens this month',
      value: totalTokensThisMonth.toLocaleString(),
      sub: `${tokenRows.length} queries tracked`,
      icon: TrendingUp,
      color: '#60A5FA',
    },
    {
      label: 'User breakdown',
      value: allUsers.length.toString(),
      sub: `${trialUsers.length} trial · ${activeUsers.length} active · ${expiredUsers.length} expired`,
      icon: Users,
      color: 'var(--accent)',
    },
  ]

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
          Billing & Analytics
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Token consumption, trial status, and revenue tracking.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {statCards.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={16} strokeWidth={1.8} style={{ color }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '0.25rem' }}>
                {value}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{label}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.2rem', opacity: 0.7 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* User table */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            All users
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Sorted by token usage ↓
          </span>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
            padding: '0.6rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-raised)',
          }}>
            {['Email', 'Status', 'Tokens (month)', 'Cost (USD)', 'Days left'].map(h => (
              <span key={h} style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {allUsers.length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No users yet.</div>
          ) : allUsers.map((u, i) => {
            const isLast = i === allUsers.length - 1
            const endDate = u.subscription_status === 'trial' ? u.trial_ended_at : u.subscription_ends_at
            const daysLeft = getDaysLeft(endDate)
            const daysLeftDisplay = daysLeft === null ? '—'
              : daysLeft === 0 ? <span style={{ color: '#F87171' }}>Expired</span>
              : `${daysLeft}d`

            return (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                  padding: '0.75rem 1.25rem',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '1rem' }}>
                  {u.email}
                </span>
                <span>
                  <StatusBadge status={u.subscription_status ?? 'expired'} daysLeft={null} />
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {(u.tokens_used_this_month ?? 0).toLocaleString()}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  ${(u.estimated_cost_usd ?? 0).toFixed(4)}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {daysLeftDisplay}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom: billing records */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Payment records
          </h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Manual payments during beta</span>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '0.6rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-raised)',
          }}>
            {['User', 'Amount', 'Date', 'Status'].map(h => (
              <span key={h} style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {h}
              </span>
            ))}
          </div>

          {(billingRecords ?? []).length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No payments yet — this will populate when you log manual payments during beta.
            </div>
          ) : (billingRecords ?? []).map((r, i) => {
            const isLast = i === (billingRecords ?? []).length - 1
            return (
              <div
                key={r.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  padding: '0.75rem 1.25rem',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '1rem' }}>
                  {userEmailMap[r.user_id] ?? r.user_id}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  ${r.amount_usd}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {new Date(r.payment_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <span>
                  <span className={`badge ${r.status === 'paid' ? 'badge-accent' : 'badge-muted'}`}>
                    {r.status}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
