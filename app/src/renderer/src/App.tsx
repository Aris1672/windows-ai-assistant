import { useState, useEffect } from 'react'
import CommandPalette from './components/CommandPalette'
import LoginScreen from './components/LoginScreen'

export default function App(): JSX.Element | null {
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // On mount, check whether a token is already stored
  useEffect(() => {
    window.electronAPI.getToken().then((stored) => {
      setToken(stored)
      setReady(true)
    })
  }, [])

  const handleLogin = (newToken: string): void => {
    window.electronAPI.setToken(newToken)
    setToken(newToken)
  }

  const handleLogout = (): void => {
    window.electronAPI.setToken(null)
    setToken(null)
  }

  // Don't render until we've checked storage — avoids flashing the login screen
  if (!ready) return null

  return token ? (
    <CommandPalette token={token} onLogout={handleLogout} />
  ) : (
    <LoginScreen onLogin={handleLogin} />
  )
}
