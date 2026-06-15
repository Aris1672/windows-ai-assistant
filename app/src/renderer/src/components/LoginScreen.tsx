import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './LoginScreen.css'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://windows-ai-assistant-web.vercel.app'

interface LoginScreenProps {
  onLogin: (accessToken: string, refreshToken: string) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

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

      if (!result.ok || result.data === null) {
        const errData = result.data as { error?: string } | null
        setError(errData?.error ?? t('login.errorCredentials'))
        emailRef.current?.focus()
        return
      }

      const successData = result.data as { access_token: string; refresh_token: string }
      onLogin(successData.access_token, successData.refresh_token ?? '')
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

          <button
            className="login-btn"
            type="submit"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? t('login.submitting') : t('login.submit')}
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
