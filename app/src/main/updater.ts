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

export function initAutoUpdater(win: BrowserWindow): void {
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
    autoUpdater.quitAndInstall()
  })

  // ── Initial check — delayed so the app is fully settled first ────────────

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err: Error) => {
      console.warn('[updater] check failed (non-fatal):', err.message)
    })
  }, 5_000)

  function send(payload: Record<string, unknown>): void {
    if (!win.isDestroyed()) {
      win.webContents.send('updater-event', payload)
    }
  }
}
