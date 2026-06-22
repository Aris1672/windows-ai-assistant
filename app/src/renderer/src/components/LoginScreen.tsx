import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './LoginScreen.css'

const WEB_URL = (import.meta.env.VITE_WEB_URL ?? 'https://windows-ai-assistant-web.vercel.app').replace(/\/$/, '')

// How many times to silently retry on a network error before giving up.
// Delays: 3 s → 6 s → 9 s  (covers ~18 s of post-boot network warm-up)
const MAX_RETRIES = 4
const RETRY_DELAY_MS = 3000

interface LoginScreenProps {
  onLogin: (accessToken: string, refreshToken: string) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps): JSX.Element {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef(false)

  // Clear abort flag when component unmounts mid-retry
  useEffect(() => {
    abortRef.current = false
    return () => { abortRef.current = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)
    setStatusMsg(t('login.submitting'))
    abortRef.current = false

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (abortRef.current) break

      try {
        const result = await window.electronAPI.apiRequest({
          url: `${WEB_URL}/api/auth/login`,
          method: 'POST',
          body: { email: email.trim(), password }
        })

        // ── Network error (no response reached Vercel) ──────────────────
        // This happens right after Windows boots before the network stack
        // is fully ready. Retry silently with increasing delays.
        if (result.status === 0 || result.data === null) {
          const isLast = attempt === MAX_RETRIES - 1
          if (!isLast) {
            const waitSec = ((attempt + 1) * RETRY_DELAY_MS) / 1000
            setStatusMsg(t('login.retrying', { sec: waitSec }))
            await new Promise(r => setTimeout(r, (attempt + 1) * RETRY_DELAY_MS))
            setStatusMsg(t('login.submitting'))
            continue
          }
          setError(t('login.errorNetwork'))
          emailRef.current?.focus()
          break
        }

        // ── Server returned an error (wrong credentials, etc.) ──────────
        if (!result.ok) {
          const errData = result.data as { error?: string } | null
          setError(errData?.error ?? t('login.errorCredentials'))
          emailRef.current?.focus()
          break
        }

        // ── Success ─────────────────────────────────────────────────────
        const successData = result.data as { access_token: string; refresh_token: string }

        if (!successData.refresh_token) {
          setError(t('login.errorNetwork'))
          emailRef.current?.focus()
          break
        }

        onLogin(successData.access_token, successData.refresh_token)
        break

      } catch {
        const isLast = attempt === MAX_RETRIES - 1
        if (!isLast) {
          const waitSec = ((attempt + 1) * RETRY_DELAY_MS) / 1000
          setStatusMsg(t('login.retrying', { sec: waitSec }))
          await new Promise(r => setTimeout(r, (attempt + 1) * RETRY_DELAY_MS))
          setStatusMsg(t('login.submitting'))
          continue
        }
        setError(t('login.errorNetwork'))
        emailRef.current?.focus()
      }
    }

    setLoading(false)
    setStatusMsg(null)
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

          {statusMsg && !error && loading && (
            <p className="login-hint">{statusMsg}</p>
          )}

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
