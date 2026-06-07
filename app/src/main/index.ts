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
import { initAutoUpdater } from './updater'                // ← NEW

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

let lastContext: ContextBundle | null = null

// ─── App Ready ───────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.yourcompany.windowsai')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createPaletteWindow()

  // ── Auto-updater (production only) ───────────────────────────────────────
  // Deferred so the palette window is guaranteed to exist when we attach listeners.
  if (app.isPackaged) {
    setTimeout(() => {
      const win = getPaletteWindow()
      if (win) initAutoUpdater(win)
    }, 0)
  }
  // ─────────────────────────────────────────────────────────────────────────

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

ipcMain.handle(
  'execute-action',
  async (_event, { action, conversationId }: { action: Action; conversationId: string | null }) => {
    const token = store.get('authToken', undefined) ?? null

    try {
      await executeAction(action)

      if (token) {
        syncActionHistory({
          token,
          actionType:     action.type,
          actionLabel:    ACTION_LABELS[action.type],
          contextApp:     lastContext?.activeApp    ?? null,
          contextFolder:  lastContext?.activeFilePath
            ? lastContext.activeFilePath.replace(/[/\\][^/\\]+$/, '') || null
            : null,
          status:         'done',
          conversationId: conversationId ?? null,
        }).catch((err) => console.warn('[sync-action] failed:', err))
      }

      return { ok: true }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[execute-action] error:', message)

      if (token) {
        syncActionHistory({
          token,
          actionType:     action.type,
          actionLabel:    ACTION_LABELS[action.type],
          contextApp:     lastContext?.activeApp    ?? null,
          contextFolder:  lastContext?.activeFilePath
            ? lastContext.activeFilePath.replace(/[/\\][^/\\]+$/, '') || null
            : null,
          status:         'error',
          conversationId: conversationId ?? null,
        }).catch((err) => console.warn('[sync-action] failed:', err))
      }

      return { ok: false, error: message }
    }
  }
)

// ─── Action History Sync ──────────────────────────────────────────────────────

async function syncActionHistory({
  token,
  actionType,
  actionLabel,
  contextApp,
  contextFolder,
  status,
  conversationId,
}: {
  token:           string
  actionType:      string
  actionLabel:     string
  contextApp:      string | null
  contextFolder:   string | null
  status:          'done' | 'error'
  conversationId:  string | null
}): Promise<void> {
  await net.fetch(`${WEB_URL}/api/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({
      action_type:     actionType,
      action_label:    actionLabel,
      context_app:     contextApp,
      context_folder:  contextFolder,
      status,
      conversation_id: conversationId,
    }),
  })
}

// ─── Generic API Request Proxy ───────────────────────────────────────────────

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
