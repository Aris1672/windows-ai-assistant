'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Zap,
  BookOpen,
  History,
  Clock,
  Puzzle,
  LogOut,
  ChevronRight,
  Shield,
} from 'lucide-react'
import '@/lib/i18n'

export default function Sidebar({ userEmail, isAdmin = false }: { userEmail: string; isAdmin?: boolean }) {
  const { t, i18n } = useTranslation()
  const pathname = usePathname()
  const router   = useRouter()

  const NAV = [
    { href: '/dashboard',             label: t('sidebar.overview'),      icon: LayoutDashboard },
    { href: '/dashboard/instructions', label: t('sidebar.instructions'), icon: BookOpen },
    { href: '/dashboard/skills',       label: t('sidebar.skills'),       icon: Zap },
    { href: '/dashboard/scheduled',    label: t('sidebar.scheduled'),    icon: Clock },
    { href: '/dashboard/integrations', label: t('sidebar.integrations'), icon: Puzzle },
    { href: '/dashboard/history',      label: t('sidebar.history'),      icon: History },
  ]

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' })
    router.push('/login')
    router.refresh()
  }

  function toggleLanguage() {
    i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru')
  }

  return (
    <aside className="sidebar">
      {/* Wordmark */}
      <div style={{ padding: '1.5rem 1rem 1rem' }}>
        <div className="wordmark" style={{ fontSize: '1.1rem' }}>
          Windows <span>AI</span>
        </div>
      </div>

      <hr className="divider" style={{ margin: '0 1rem 0.75rem' }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
              {active && (
                <ChevronRight
                  size={13}
                  strokeWidth={2}
                  style={{ marginLeft: 'auto', opacity: 0.5 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.75rem 0.5rem 1.25rem' }}>
        <hr className="divider" style={{ margin: '0 0.25rem 0.75rem' }} />

        {isAdmin && (
          <Link
            href="/admin"
            className="nav-item"
            style={{ marginBottom: '4px', color: 'var(--error)' }}
          >
            <Shield size={15} strokeWidth={1.8} />
            {t('sidebar.adminPanel')}
          </Link>
        )}

        <div style={{
          padding:       '0 0.5rem',
          marginBottom:  '0.5rem',
          fontSize:      '0.75rem',
          color:         'var(--text-muted)',
          overflow:      'hidden',
          textOverflow:  'ellipsis',
          whiteSpace:    'nowrap',
        }}>
          {userEmail}
        </div>

        <button
          onClick={toggleLanguage}
          className="nav-item"
          style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', marginBottom: '2px' }}
        >
          <span style={{ fontSize: '13px' }}>🌐</span>
          {i18n.language === 'ru' ? 'English' : 'Русский'}
        </button>

        <button
          onClick={signOut}
          className="nav-item"
          style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
        >
          <LogOut size={15} strokeWidth={1.8} />
          {t('common.signOut')}
        </button>
      </div>
    </aside>
  )
}
