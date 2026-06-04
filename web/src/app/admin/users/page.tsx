import { createAdminClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { Shield, User, Ban, CheckCircle } from 'lucide-react'

// ── Server actions ─────────────────────────────────────────────────────────────

async function updateRole(formData: FormData) {
  'use server'
  const id   = formData.get('id') as string
  const role = formData.get('role') as string
  if (!id || !role) return
  const admin = createAdminClient()
  await admin.from('users').update({ role }).eq('id', id)
  revalidatePath('/admin/users')
  revalidatePath('/admin')
}

async function updateTier(formData: FormData) {
  'use server'
  const id   = formData.get('id') as string
  const tier = formData.get('tier') as string
  if (!id || !tier) return
  const admin = createAdminClient()
  await admin.from('users').update({ tier }).eq('id', id)
  revalidatePath('/admin/users')
}

async function toggleBlock(formData: FormData) {
  'use server'
  const id         = formData.get('id') as string
  const isBlocked  = formData.get('is_blocked') === 'true'
  if (!id) return

  // 1. Update our users table
  const admin = createAdminClient()
  await admin.from('users').update({ is_blocked: !isBlocked }).eq('id', id)

  // 2. Ban/unban in Supabase Auth (prevents login)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: isBlocked ? 'none' : '876600h', // unblock or block ~100 years
  })

  revalidatePath('/admin/users')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLES = ['user', 'administrator']
const TIERS = ['free', 'pro', 'enterprise']

const confirmBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--accent)',
  borderRadius: '5px',
  cursor: 'pointer',
  color: 'var(--accent)',
  padding: '0.25rem 0.5rem',
  fontSize: '0.75rem',
  flexShrink: 0 as const,
  fontWeight: 600,
  transition: 'background 0.15s',
}

// ── Page ───────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{ q?: string }>

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = '' } = await searchParams
  const admin = createAdminClient()

  let query = admin
    .from('users')
    .select('id, email, display_name, role, tier, is_blocked, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (q.trim()) query = query.ilike('email', `%${q.trim()}%`)

  const { data: users, count } = await query

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
            Users
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage roles, subscription tiers, and access.
          </p>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '0.375rem' }}>
          {(count ?? 0).toLocaleString()} {q ? 'matching' : 'total'}
        </span>
      </div>

      {/* Search */}
      <form method="GET" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
        <input
          name="q"
          defaultValue={q}
          className="form-input"
          placeholder="Search by email…"
          style={{ maxWidth: '300px' }}
        />
        <button type="submit" className="btn-ghost" style={{ width: 'auto' }}>
          Search
        </button>
        {q && (
          <a href="/admin/users" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
            Clear
          </a>
        )}
      </form>

      {/* Table */}
      {(users ?? []).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          {q ? `No users matching "${q}".` : 'No users yet.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px 110px 80px', gap: '1rem', padding: '0.625rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            {['User', 'Role', 'Tier', 'Joined', 'Block'].map(h => (
              <span key={h} style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {(users ?? []).map((u, i) => {
            const blocked = u.is_blocked ?? false
            return (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 180px 180px 110px 80px',
                  gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  alignItems: 'center',
                  borderBottom: i < (users ?? []).length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: blocked ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {/* User info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.2rem' }}>
                    {u.role === 'administrator'
                      ? <Shield size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      : <User size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    }
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </span>
                    {blocked && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#F87171', background: '#F8717118', border: '1px solid #F8717130', borderRadius: '4px', padding: '0.1rem 0.35rem', flexShrink: 0 }}>
                        BLOCKED
                      </span>
                    )}
                  </div>
                  {u.display_name && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '1.375rem' }}>
                      {u.display_name}
                    </div>
                  )}
                </div>

                {/* Role selector */}
                <form action={updateRole} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  <input type="hidden" name="id" value={u.id} />
                  <select
                    name="role"
                    defaultValue={u.role ?? 'user'}
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', flex: 1 }}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button type="submit" title="Save role" style={confirmBtnStyle}>✓</button>
                </form>

                {/* Tier selector */}
                <form action={updateTier} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                  <input type="hidden" name="id" value={u.id} />
                  <select
                    name="tier"
                    defaultValue={u.tier ?? 'free'}
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', flex: 1 }}
                  >
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button type="submit" title="Save tier" style={confirmBtnStyle}>✓</button>
                </form>

                {/* Joined */}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(u.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}
                </span>

                {/* Block / Unblock */}
                <form action={toggleBlock}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="is_blocked" value={String(blocked)} />
                  <button
                    type="submit"
                    title={blocked ? 'Unblock user' : 'Block user'}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${blocked ? '#34D39940' : '#F8717140'}`,
                      borderRadius: '5px',
                      cursor: 'pointer',
                      color: blocked ? '#34D399' : '#F87171',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    {blocked
                      ? <><CheckCircle size={11} /> Allow</>
                      : <><Ban size={11} /> Block</>
                    }
                  </button>
                </form>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
