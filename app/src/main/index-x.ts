import { app, ipcMain, shell, net } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createTray, destroyTray } from './tray'
import { registerHotkey, unregisterHotkey } from './hotkey'
import { createPaletteWindow, showPalette, hidePalette, getPaletteWindow } from './windows'
import { getContext } from './context-detector'
import { store } from './store'

// ─── Single Instance Lock ────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  const win = getPaletteWindow()
  if (win) showPalette()
})

// ─── App Ready ───────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.yourcompany.windowsai')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createPaletteWindow()

  createTray({
    onShowPalette: async () => {
      const context = await getContext()
      showPalette(context)
    },
    onQuit: () => {
      unregisterHotkey()
      destroyTray()
      app.quit()
    }
  })

  registerHotkey({
    onTrigger: async () => {
      const win = getPaletteWindow()
      if (!win) return

      if (win.isVisible()) {
        hidePalette()
      } else {
        const context = await getContext()
        showPalette(context)
      }
    }
  })

  console.log('[App] Ready. Ctrl+Space to open the palette.')
})

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.on('hide-palette', () => hidePalette())

ipcMain.handle('get-context', async () => {
  return await getContext()
})

ipcMain.handle('get-token', () => store.get('authToken', undefined) ?? null)
ipcMain.on('set-token', (_event, token: string | null) => {
  if (token) {
    store.set('authToken', token)
  } else {
    store.delete('authToken')
  }
})

ipcMain.on('open-dashboard', () => {
  shell.openExternal(
    (process.env['VITE_WEB_URL'] ?? 'https://your-app.vercel.app') + '/dashboard'
  )
})

// ─── Generic API Request Proxy ───────────────────────────────────────────────
// Handles simple JSON request/response calls (e.g. login).
// The renderer cannot fetch external URLs without CORS headers, so all
// HTTP calls are routed through the main process via net.fetch (no CORS).

ipcMain.handle(
  'api-request',
  async (
    _event,
    {
      url,
      method = 'POST',
      headers = {},
      body
    }: {
      url: string
      method?: string
      headers?: Record<string, string>
      body?: object
    }
  ) => {
    try {
      const res = await net.fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body !== undefined ? JSON.stringify(body) : undefined
      })

      const data = await res.json()
      return { ok: res.ok, status: res.status, data }
    } catch (err: unknown) {
      console.error('[api-request] error:', err)
      return { ok: false, status: 0, data: null }
    }
  }
)

// ─── Streaming API Proxy ──────────────────────────────────────────────────────
// Handles SSE streaming responses (e.g. the context/AI call).
// Chunks are forwarded to the renderer via 'stream-event' IPC messages.

let streamAbort: AbortController | null = null

ipcMain.on(
  'stream-context',
  async (
    event,
    { url, token, body }: { url: string; token: string; body: object }
  ) => {
    streamAbort?.abort()
    streamAbort = new AbortController()

    try {
      const res = await net.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body),
        signal: streamAbort.signal
      })

      if (res.status === 401) {
        event.sender.send('stream-event', { type: 'auth-error' })
        return
      }
      if (!res.ok) {
        event.sender.send('stream-event', { type: 'http-error', status: res.status })
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        event.sender.send('stream-event', {
          type: 'chunk',
          data: decoder.decode(value, { stream: true })
        })
      }

      event.sender.send('stream-event', { type: 'done' })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('[stream-context] error:', err)
      event.sender.send('stream-event', { type: 'error' })
    }
  }
)

ipcMain.on('cancel-stream', () => {
  streamAbort?.abort()
  streamAbort = null
})

// ─── Lifecycle ───────────────────────────────────────────────────────────────

app.on('window-all-closed', () => {
  // intentionally empty — tray app stays alive
})

app.on('before-quit', () => {
  unregisterHotkey()
  destroyTray()
})
