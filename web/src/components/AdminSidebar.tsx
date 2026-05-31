'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { LayoutDashboard, Users, BarChart2, Settings, LogOut, ChevronRight, ArrowLeft } from 'lucide-react'

const NAV = [
  { href: '/admin',           label: 'Overview',  icon: LayoutDashboard },
  { href: '/admin/users',     label: 'Users',     icon: Users           },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart2       },
  { href: '/admin/settings',  label: 'Settings',  icon: Settings        },
]

export default function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      {/* Wordmark + admin badge */}
      <div style={{ padding: '1.5rem 1rem 0.875rem' }}>
        <div className="wordmark" style={{ fontSize: '1.1rem' }}>
          Windows <span>AI</span>
        </div>
        <div style={{
          marginTop: '0.3rem',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--error)',
          background: 'rgba(255,82,82,0.08)',
          border: '1px solid rgba(255,82,82,0.2)',
          borderRadius: '4px',
          padding: '0.1rem 0.45rem',
          display: 'inline-block',
        }}>
          Admin
        </div>
      </div>

      <hr className="divider" style={{ margin: '0 1rem 0.75rem' }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(href)
          return (
            <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={15} strokeWidth={1.8} />
              {label}
              {active && <ChevronRight size={13} strokeWidth={2} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.75rem 0.5rem 1.25rem' }}>
        <hr className="divider" style={{ margin: '0 0.25rem 0.75rem' }} />
        <Link href="/dashboard" className="nav-item" style={{ marginBottom: '4px' }}>
          <ArrowLeft size={15} strokeWidth={1.8} /> Back to dashboard
        </Link>
        <div style={{ padding: '0.375rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userEmail}
        </div>
        <button
          onClick={signOut}
          className="nav-item"
          style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
        >
          <LogOut size={15} strokeWidth={1.8} /> Sign out
        </button>
      </div>
    </aside>
  )
}
