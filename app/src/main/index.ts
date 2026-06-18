/**
 * app/src/main/index.ts
 */

import { app, ipcMain, shell, net, dialog } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import log from 'electron-log'
import { createTray, destroyTray } from './tray'
import { registerHotkey, unregisterHotkey, reregisterHotkey } from './hotkey'
import { createPaletteWindow, showPalette, hidePalette, getPaletteWindow, openPinWindow, closePinWindow } from './windows'
import { getContext } from './context-detector'
import type { ContextBundle } from './context-detector'
import { store } from './store'
import type { ContextClip } from './store'
import { executeAction, ACTION_LABELS } from './actions'
import type { Action } from './actions'
import { initAutoUpdater } from './updater'
import { findFileRefs } from './file-finder'
import { readFileContent } from './file-reader'

const WEB_URL = (process.env['VITE_WEB_URL'] ?? 'https://windows-ai-assistant-web.vercel.app').replace(/\/$/, '')

// ─── Logging ──────────────────────────────────────────────────────────────────
// Configured here (not just inside updater.ts) so network errors from login/
// streaming are captured from the very first IPC call, not only after the
// updater has had a chance to initialize. Writes to the same file:
// %APPDATA%\<app name>\logs\main.log
log.transports.file.level = 'debug'
log.transports.file.resolvePathFn = () =>
  require('path').join(app.getPath('userData'), 'logs', 'main.log')
log.info('[index] logging initialized — WEB_URL =', WEB_URL)

// Helper: pull out the useful bits of a fetch/network error so the log
// shows the actual Chromium net:: code (e.g. ERR_CONNECTION_RESET) instead
// of just "Failed to fetch" / "[object Object]".
function describeNetError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // net.fetch errors often carry a `cause` with the real net:: code
      cause: (err as { cause?: unknown }).cause ?? null,
      stack: err.stack,
    }
  }
  return { raw: String(err) }
}

// Helper: detect transient network errors worth retrying (startup race,
// Windows network stack not ready, VPN still connecting, etc.)
function isRetryableNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message ?? ''
  return (
    msg.includes('ERR_CONNECTION_TIMED_OUT') ||
    msg.includes('ERR_NAME_NOT_RESOLVED') ||
    msg.includes('ERR_INTERNET_DISCONNECTED') ||
    msg.includes('ERR_CONNECTION_REFUSED') ||
    msg.includes('ERR_NETWORK_CHANGED') ||
    msg.includes('net::') ||
    err.name === 'AbortError'
  )
}

// Wrapper around net.fetch that retries on transient network errors.
// Uses a fresh AbortController + timeout for each attempt so a timed-out
// request doesn't poison subsequent retries.
async function netFetchWithRetry(
  url: string,
  options: Omit<Parameters<typeof net.fetch>[1], 'signal'> & { timeoutMs?: number },
  maxRetries = 2,
  baseDelayMs = 3000
): Promise<Response> {
  const { timeoutMs = 15000, ...fetchOptions } = options

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await net.fetch(url, { ...fetchOptions, signal: controller.signal })
      clearTimeout(timer)
      return res
    } catch (err: unknown) {
      clearTimeout(timer)

      if (!isRetryableNetworkError(err) || attempt === maxRetries) {
        throw err
      }

      const delay = baseDelayMs * Math.pow(2, attempt) // 3 s → 6 s
      log.warn(
        `[api-request] network error on attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${delay}ms —`,
        (err as Error).message
      )
      await new Promise((res) => setTimeout(res, delay))
    }
  }
  throw new Error('[netFetchWithRetry] unreachable')
}

// ─── Single Instance Lock ─────────────────────────────────────────────────────

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

// ─── App Ready ────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.yourcompany.windowsai')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createPaletteWindow()

  if (app.isPackaged) {
    setTimeout(() => {
      const win = getPaletteWindow()
      if (win) initAutoUpdater(win)
    }, 0)
  }

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

  console.log('[App] Ready. Hotkey active:', store.getHotkey())
})

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

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

ipcMain.on('set-refresh-token', (_event, token: string | null) => {
  if (token) {
    store.set('refreshToken', token)
  } else {
    store.delete('refreshToken')
  }
})

ipcMain.on('open-dashboard', () => {
  shell.openExternal(`${WEB_URL}/dashboard`)
})

// ─── Hotkey IPC ───────────────────────────────────────────────────────────────

ipcMain.handle('get-hotkey', () => store.getHotkey())

ipcMain.handle('set-hotkey', (_event, hotkey: string) => {
  const ok = reregisterHotkey(hotkey)
  if (ok) store.setHotkey(hotkey)
  return ok
})

// ─── Context Tray IPC ─────────────────────────────────────────────────────────

ipcMain.handle('tray-get-clips', (): ContextClip[] => {
  return store.trayGetClips()
})

ipcMain.handle(
  'tray-add-clip',
  (_event, clip: ContextClip): ContextClip[] => {
    return store.trayAddClip(clip)
  }
)

ipcMain.handle(
  'tray-remove-clip',
  (_event, index: number): ContextClip[] => {
    return store.trayRemoveClip(index)
  }
)

ipcMain.handle('tray-clear', (): void => {
  store.trayClear()
})

// ─── Action Executor ──────────────────────────────────────────────────────────

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

// ─── File Reference Resolver ──────────────────────────────────────────────────

ipcMain.handle(
  'resolve-file-refs',
  async (
    _event,
    { query, activeFolder, activeFilePath }: {
      query:          string
      activeFolder:   string | null
      activeFilePath: string | null
    }
  ) => {
    try {
      console.log('[resolve-file-refs] query:', query)
      console.log('[resolve-file-refs] activeFolder:', activeFolder)
      console.log('[resolve-file-refs] activeFilePath:', activeFilePath)
      const foundFiles = await findFileRefs(query, activeFolder, activeFilePath)
      console.log('[resolve-file-refs] found files:', foundFiles)
      const results = await Promise.all(foundFiles.map(f => readFileContent(f.filePath)))
      const filtered = results.filter(Boolean)
      console.log('[resolve-file-refs] returning:', filtered.map(r => r?.fileName))
      return filtered
    } catch (err) {
      console.error('[resolve-file-refs] error:', err)
      return []
    }
  }
)

// ─── File Picker ──────────────────────────────────────────────────────────────

ipcMain.handle('pick-file', async () => {
  const win = getPaletteWindow()
  const result = await dialog.showOpenDialog(win!, {
    title: 'Attach file',
    properties: ['openFile'],
    filters: [
      { name: 'Supported files', extensions: ['txt', 'md', 'csv', 'json', 'docx', 'pdf', 'xlsx', 'xls'] },
      { name: 'All files', extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) return null

  try {
    const fileRef = await readFileContent(result.filePaths[0])
    return fileRef ?? null
  } catch (err) {
    console.error('[pick-file] error:', err)
    return null
  }
})

// ─── Pin Response ─────────────────────────────────────────────────────────────

ipcMain.handle('pin-response', (_event, text: string) => {
  openPinWindow(text)
})

ipcMain.handle('close-pin', () => {
  closePinWindow()
})

// ─── Generic API Request Proxy ────────────────────────────────────────────────

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
      const res = await netFetchWithRetry(
        url,
        {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          timeoutMs: 15000,
        },
        2,    // up to 2 retries (3 total attempts)
        3000  // base delay: 3 s → 6 s
      )

      const data = await res.json()
      return { ok: res.ok, status: res.status, data }
    } catch (err: unknown) {
      const isTimeout = err instanceof Error && err.name === 'AbortError'
      log.error('[api-request] all attempts failed for', url, describeNetError(err))
      return { ok: false, status: isTimeout ? 408 : 0, data: null }
    }
  }
)

// ─── Streaming API Proxy ──────────────────────────────────────────────────────

// ─── Token Refresh ────────────────────────────────────────────────────────────

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = store.get('refreshToken', undefined)
  if (!refreshToken) return null

  try {
    const res = await net.fetch(`${WEB_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return null

    const data = await res.json() as { access_token: string; refresh_token: string }
    store.set('authToken', data.access_token)
    store.set('refreshToken', data.refresh_token)
    log.info('[token-refresh] Token refreshed successfully')
    return data.access_token
  } catch (err) {
    log.error('[token-refresh] Failed:', describeNetError(err))
    return null
  }
}

let streamAbort: AbortController | null = null

ipcMain.on(
  'stream-context',
  async (
    event,
    { url, token: initialToken, body }: { url: string; token: string; body: object }
  ) => {
    streamAbort?.abort()
    streamAbort = new AbortController()
    const { signal } = streamAbort

    const doStream = async (token: string, isRetry = false): Promise<void> => {
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
          if (!isRetry) {
            const newToken = await tryRefreshToken()
            if (newToken) {
              await doStream(newToken, true)
              return
            }
          }
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
        log.error('[stream-context] error calling', url, describeNetError(err))
        event.sender.send('stream-event', { type: 'error' })
      }
    }

    await doStream(initialToken)
  }
)

ipcMain.on('cancel-stream', () => {
  streamAbort?.abort()
  streamAbort = null
})

// ─── Lifecycle ────────────────────────────────────────────────────────────────

app.on('window-all-closed', () => {
  // intentionally empty — tray app stays alive
})

app.on('before-quit', () => {
  unregisterHotkey()
  destroyTray()
})
