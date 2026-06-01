import { useState, useRef } from 'react'

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'https://your-app.vercel.app'

interface LoginScreenProps {
  onLogin: (token: string) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps): JSX.Element {
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
      // Route through main process — renderer fetch() is blocked by CORS
      const result = await window.electronAPI.apiRequest({
        url: `${WEB_URL}/api/auth/login`,
        method: 'POST',
        body: { email: email.trim(), password }
      })

      if (!result.ok || result.data === null) {
        const errData = result.data as { error?: string } | null
        setError(errData?.error ?? 'Login failed. Check your credentials.')
        emailRef.current?.focus()
        return
      }

      const successData = result.data as { access_token: string }
      onLogin(successData.access_token)
    } catch {
      setError('Unable to connect. Check your internet connection.')
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
            <p className="login-brand">AI Assistant</p>
            <p className="login-tagline">Sign in to continue</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            ref={emailRef}
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoFocus
            autoComplete="email"
          />
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />

          {error && (
            <p className="login-error">{error}</p>
          )}

          <button
            className="login-btn"
            type="submit"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-register">
          No account?{' '}
          <button
            type="button"
            className="login-link"
            onClick={() => window.electronAPI.openDashboard()}
          >
            Register on the website ↗
          </button>
        </p>

      </div>
    </div>
  )
}
