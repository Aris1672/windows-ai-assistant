'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import '@/lib/i18n'

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      })

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || t('auth.login.errorInvalid'))
      }
    } catch {
      setError(t('auth.login.errorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="bg-grid"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div className="wordmark" style={{ fontSize: '1.4rem', marginBottom: '0.375rem' }}>
            Windows <span>AI</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {t('auth.login.heading')}
          </p>
        </div>

        <div className="auth-card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {error && <div className="error-banner">{error}</div>}

            <div>
              <label className="form-label">{t('auth.login.emailLabel')}</label>
              <input
                className="form-input"
                type="email"
                placeholder={t('auth.login.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="form-label">{t('auth.login.passwordLabel')}</label>
              <input
                className="form-input"
                type="password"
                placeholder={t('auth.login.passwordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <div style={{ marginTop: '0.25rem' }}>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? t('auth.login.submitting') : t('auth.login.submit')}
              </button>
            </div>

          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {t('auth.login.noAccount')}{' '}
          <Link href="/register" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
            {t('auth.login.createOne')}
          </Link>
        </p>

      </div>
    </div>
  )
}
