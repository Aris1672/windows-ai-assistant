import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './LoginScreen.css'

const WEB_URL = (import.meta.env.VITE_WEB_URL ?? 'https://windows-ai-assistant-web.vercel.app').replace(/\/$/, '')

interface LoginScreenProps {
  onLogin: (accessToken: string, refreshToken: string) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slowConnection, setSlowConnection] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show a "slow connection" hint after 8 s of loading so the user
  // knows the app is still trying (retrying in the background).
  useEffect(() => {
    if (loading) {
      slowTimer.current = setTimeout(() => setSlowConnection(true), 8000)
    } else {
      if (slowTimer.current) clearTimeout(slowTimer.current)
      setSlowConnection(false)
    }
    return () => {
      if (slowTimer.current) clearTimeout(slowTimer.current)
    }
  }, [loading])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.apiRequest({
        url: `${WEB_URL}/api/auth/login`,
        method: 'POST',
        body: { email: email.trim(), password }
      })

      if (result.status === 0 || result.data === null) {
        setError(t('login.errorNetwork'))
        emailRef.current?.focus()
        return
      }

      if (!result.ok) {
        const errData = result.data as { error?: string } | null
        setError(errData?.error ?? t('login.errorCredentials'))
        emailRef.current?.focus()
        return
      }

      const successData = result.data as { access_token: string; refresh_token: string }

      if (!successData.refresh_token) {
        setError(t('login.errorNetwork'))
        emailRef.current?.focus()
        return
      }

      onLogin(successData.access_token, successData.refresh_token)
    } catch {
      setError(t('login.errorNetwork'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      <div className="login">

        <div className="login-header">
          <svg className="login-logo" width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="9" fill="url(#logoGrad)" />
            <path d="M10 16l4.5 4.5 8-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stopColor="#7c6fff" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <p className="login-brand">{t('login.brand')}</p>
            <p className="login-tagline">{t('login.tagline')}</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            ref={emailRef}
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.emailPlaceholder')}
            autoFocus
            autoComplete="email"
          />
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.passwordPlaceholder')}
            autoComplete="current-password"
          />

          {error && <p className="login-error">{error}</p>}

          {slowConnection && !error && (
            <p className="login-hint">{t('login.slowConnection')}</p>
          )}

          <button
            className="login-btn"
            type="submit"
            disabled={loading || !email.trim() || !password}
          >
            {loading
              ? slowConnection
                ? t('login.submittingRetry')
                : t('login.submitting')
              : t('login.submit')}
          </button>
        </form>

        <p className="login-register">
          {t('login.noAccount')}{' '}
          <button
            type="button"
            className="login-link"
            onClick={() => window.electronAPI.openDashboard()}
          >
            {t('login.register')}
          </button>
        </p>

        {/* Language toggle */}
        <button
          type="button"
          className="login-link"
          style={{ marginTop: '0.5rem', fontSize: '0.72rem', opacity: 0.5 }}
          onClick={() => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru')}
        >
          {i18n.language === 'ru' ? 'English' : 'Русский'}
        </button>

      </div>
    </div>
  )
}