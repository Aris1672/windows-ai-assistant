/**
 * app/src/main/index.ts
 */

import { app, ipcMain, shell, net } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createTray, destroyTray } from './tray'
import { registerHotkey, unregisterHotkey } from './hotkey'
import { createPaletteWindow, showPalette, hidePalette, getPaletteWindow } from './windows'
import { getContext } from './context-detector'
import type { ContextBundle } from './context-detector'
import { store } from './store'
import { executeAction, ACTION_LABELS } from './actions'
import type { Action } from './actions'

const WEB_URL = process.env['VITE_WEB_URL'] ?? 'https://your-app.vercel.app'

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

// ─── Last known context ───────────────────────────────────────────────────────
// Captured just before the palette opens. Used by the action sync to record
// which app was active when an action ran — without touching the preload API.

let lastContext: ContextBundle | null = null

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
      lastContext = context
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
        lastContext = context
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
  shell.openExternal(`${WEB_URL}/dashboard`)
})

// ─── Action Executor ─────────────────────────────────────────────────────────
// Called by the renderer after the user confirms (or immediately for safe actions).
// After execution, syncs a record to Supabase via the Vercel API — fire-and-forget.

ipcMain.handle('execute-action', async (_event, action: Action) => {
  const token = store.get('authToken', undefined) ?? null

  try {
    await executeAction(action)

    // Sync success record — non-blocking, non-fatal
    if (token) {
      syncActionHistory({
        token,
        actionLabel: ACTION_LABELS[action.type],
        contextApp:  lastContext?.activeApp ?? null,
        status:      'done',
      }).catch((err) => console.warn('[sync-action] failed:', err))
    }

    return { ok: true }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[execute-action] error:', message)

    // Sync failure record too
    if (token) {
      syncActionHistory({
        token,
        actionLabel:  ACTION_LABELS[action.type],
        contextApp:   lastContext?.activeApp ?? null,
        status:       'error',
        errorMessage: message,
      }).catch((err) => console.warn('[sync-action] failed:', err))
    }

    return { ok: false, error: message }
  }
})

// ─── Action History Sync ──────────────────────────────────────────────────────
// POSTs a single action record to Vercel → Supabase.
// Called after every action execution (success or failure).
// Never awaited from the IPC handler — failure here must not affect UX.

async function syncActionHistory({
  token,
  actionLabel,
  contextApp,
  status,
  errorMessage,
}: {
  token:         string
  actionLabel:   string
  contextApp:    string | null
  status:        'done' | 'error'
  errorMessage?: string
}): Promise<void> {
  await net.fetch(`${WEB_URL}/api/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({
      action_label:  actionLabel,
      context_app:   contextApp,
      status,
      error_message: errorMessage ?? null,
    }),
  })
}

// ─── Generic API Request Proxy ───────────────────────────────────────────────
// Handles simple JSON request/response calls (e.g. login, skills fetch).
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
// Handles SSE streaming responses (the context/AI call).
// Chunks are forwarded to the renderer via 'stream-event' IPC messages.
//
// NOTE: signal is intentionally NOT passed to net.fetch — there is a known
// Electron bug where passing an AbortSignal causes the request body to be
// silently dropped, resulting in a 400 from the server. Cancellation is
// handled by checking streamAbort.signal.aborted inside the read loop.

let streamAbort: AbortController | null = null

ipcMain.on(
  'stream-context',
  async (
    event,
    { url, token, body }: { url: string; token: string; body: object }
  ) => {
    streamAbort?.abort()
    streamAbort = new AbortController()
    const { signal } = streamAbort

    try {
      const res = await net.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
        // ↑ No signal here — see NOTE above
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
        if (signal.aborted) break

        const { done, value } = await reader.read()
        if (done) break
        if (signal.aborted) break

        event.sender.send('stream-event', {
          type: 'chunk',
          data: decoder.decode(value, { stream: true })
        })
      }

      if (!signal.aborted) {
        event.sender.send('stream-event', { type: 'done' })
      }
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
