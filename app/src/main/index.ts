import { app, ipcMain, shell } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createTray, destroyTray } from './tray'
import { registerHotkey, unregisterHotkey } from './hotkey'
import { createPaletteWindow, showPalette, hidePalette, getPaletteWindow } from './windows'
import { getContext } from './context-detector'
import { store } from './store'

// ─── Single Instance Lock ────────────────────────────────────────────────────
// Prevents the app from running twice. If a second instance is launched,
// bring the existing window to focus instead.

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  const win = getPaletteWindow()
  if (win) {
    showPalette()
  }
})

// ─── App Ready ───────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Set the Windows App User Model ID (used by Windows for notifications, taskbar grouping)
  electronApp.setAppUserModelId('com.yourcompany.windowsai')

  // Disable default keyboard shortcuts on BrowserWindows in production
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 1. Create the invisible overlay window (it stays alive but hidden)
  createPaletteWindow()

  // 2. System tray icon
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

  // 3. Global hotkey: Ctrl+Space — toggle palette from anywhere
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

// Renderer → hide window
ipcMain.on('hide-palette', () => hidePalette())

// Renderer → request fresh context snapshot
ipcMain.handle('get-context', async () => {
  return await getContext()
})

// Renderer ↔ auth token (stored in userData/store.json)
ipcMain.handle('get-token', () => store.get('authToken', undefined) ?? null)
ipcMain.on('set-token', (_event, token: string | null) => {
  if (token) {
    store.set('authToken', token)
  } else {
    store.delete('authToken')
  }
})

// Renderer → open the web dashboard in the system browser
ipcMain.on('open-dashboard', () => {
  shell.openExternal(
    (process.env['VITE_WEB_URL'] ?? 'https://your-app.vercel.app') + '/dashboard'
  )
})

// ─── Lifecycle ───────────────────────────────────────────────────────────────

// Keep the process alive when all windows are closed — this is a tray app.
app.on('window-all-closed', () => {
  // intentionally empty
})

app.on('before-quit', () => {
  unregisterHotkey()
  destroyTray()
})
