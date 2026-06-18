/**
 * app/src/main/updater.ts
 *
 * Wraps electron-updater. Call initAutoUpdater(win) once after the palette
 * window is created. All update events are forwarded to the renderer as
 * 'updater-event' IPC messages so the UI can show a "Restart to update" banner.
 */

import { ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import { unregisterHotkey } from './hotkey'
import { destroyTray } from './tray'
import log from 'electron-log'

export function initAutoUpdater(win: BrowserWindow): void {
  // Force file logging — creates %APPDATA%\AI-Assistant\logs\main.log
  log.transports.file.level = 'debug'
  log.transports.file.resolvePathFn = () => {
    const { app } = require('electron')
    return require('path').join(app.getPath('userData'), 'logs', 'main.log')
  }
  log.info('[updater] initAutoUpdater called — logging active')

  autoUpdater.logger = log

  // ── Last known state ──────────────────────────────────────────────────────
  // The renderer can be hidden, mid-reload, or otherwise not listening at the
  // exact moment an autoUpdater event fires — a one-shot push event is easy
  // to miss. Keeping the last payload here lets the renderer pull current
  // state on demand (e.g. every time the palette is shown) instead of relying
  // solely on having caught the live event.
  let lastState: Record<string, unknown> = { type: 'idle' }

  ipcMain.handle('updater-get-state', () => lastState)

  // Tell the updater exactly where to look for releases
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Aris1672',
    repo: 'windows-ai-assistant',
    private: false,
  })

  // Download silently in the background; install on next quit
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // ── Event forwarding to renderer ──────────────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    send({ type: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    send({ type: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    send({ type: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    send({ type: 'progress', percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info) => {
    // Renderer should show "Restart to update vX.Y.Z" banner
    send({ type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err.message)
    send({ type: 'error', message: err.message })
  })

  // ── IPC: renderer requests install ───────────────────────────────────────

  ipcMain.on('updater-install', () => {
    // Unregister hotkey + destroy tray before installer runs,
    // so Windows can replace the running .exe without being blocked.
    unregisterHotkey()
    destroyTray()
    autoUpdater.quitAndInstall()
  })

  // ── Initial check — delayed so the app is fully settled first ────────────

  const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

  function checkForUpdates(): void {
    autoUpdater.checkForUpdates().catch((err: Error) => {
      console.warn('[updater] check failed (non-fatal):', err.message)
    })
  }

  setTimeout(checkForUpdates, 5_000)
  setInterval(checkForUpdates, CHECK_INTERVAL_MS)

  function send(payload: Record<string, unknown>): void {
    lastState = payload
    if (!win.isDestroyed()) {
      win.webContents.send('updater-event', payload)
    }
  }
}
