/**
 * app/src/main/resultWindow.ts
 *
 * Opens a small standalone window to display the full output of a scheduled skill.
 * Positioned bottom-right, always on top, frameless — matches the pin window style.
 */

import { BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'path'

export interface ResultPayload {
  title:   string
  content: string
}

let resultWin: BrowserWindow | null = null

// ─── Window Creation ──────────────────────────────────────────────────────────

export function openResultWindow(payload: ResultPayload): void {
  // If already open, push new data and focus
  if (resultWin && !resultWin.isDestroyed()) {
    resultWin.webContents.send('result-payload', payload)
    resultWin.show()
    resultWin.focus()
    return
  }

  const { workArea } = screen.getPrimaryDisplay()
  const WIDTH  = 560
  const HEIGHT = 480
  const MARGIN = 16

  resultWin = new BrowserWindow({
    width:         WIDTH,
    height:        HEIGHT,
    x:             workArea.x + workArea.width  - WIDTH  - MARGIN,
    y:             workArea.y + workArea.height - HEIGHT - MARGIN,
    frame:         false,
    transparent:   false,
    resizable:     true,
    alwaysOnTop:   true,
    skipTaskbar:   false,
    title:         payload.title,
    webPreferences: {
      preload:          join(__dirname, '../preload/result.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
  })

  // Load the dedicated result page
  if (process.env['ELECTRON_RENDERER_URL']) {
    resultWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/result.html`)
  } else {
    resultWin.loadFile(join(__dirname, '../renderer/result.html'))
  }

  // Send payload once the page is ready
  resultWin.webContents.once('did-finish-load', () => {
    resultWin?.webContents.send('result-payload', payload)
  })

  resultWin.on('closed', () => {
    resultWin = null
  })
}

export function closeResultWindow(): void {
  if (resultWin && !resultWin.isDestroyed()) {
    resultWin.close()
  }
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

ipcMain.on('close-result-window', () => {
  closeResultWindow()
})

// Open links in external browser rather than the result window
ipcMain.on('open-external-url', (_event, url: string) => {
  shell.openExternal(url)
})
