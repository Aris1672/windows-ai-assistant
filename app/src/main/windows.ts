import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { ContextBundle } from './context-detector'

let paletteWindow: BrowserWindow | null = null

// ─── Creation ────────────────────────────────────────────────────────────────

export function createPaletteWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  paletteWindow = new BrowserWindow({
    width: 680,
    height: 540,
    x: Math.round((width - 680) / 2),
    y: Math.round(height * 0.18),  // ~18% from the top — feels intentional, not dead-centre
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Auto-hide when the user clicks away
  paletteWindow.on('blur', () => {
    // Small timeout so clicking a button inside the window doesn't immediately close it
    setTimeout(() => {
      if (paletteWindow && !paletteWindow.isFocused()) {
        hidePalette()
      }
    }, 100)
  })

  // Load renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    paletteWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    paletteWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    paletteWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  paletteWindow.webContents.on('did-finish-load', () => {
    console.log('[Window] Renderer loaded.')
  })

  return paletteWindow
}

// ─── Show / Hide ─────────────────────────────────────────────────────────────

export function showPalette(context?: ContextBundle): void {
  if (!paletteWindow) return

  // Re-position over the monitor the cursor is currently on
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const { x, y, width, height } = display.workArea

  paletteWindow.setPosition(
    x + Math.round((width - 680) / 2),
    y + Math.round(height * 0.18)
  )

  if (context) {
    paletteWindow.webContents.send('context-data', context)
  }

  paletteWindow.show()
  paletteWindow.focus()
  paletteWindow.webContents.send('palette-shown')
}

export function hidePalette(): void {
  if (!paletteWindow?.isVisible()) return
  paletteWindow.webContents.send('palette-hidden')
  // Give the hide animation time to play before actually hiding the window
  setTimeout(() => paletteWindow?.hide(), 150)
}

export function getPaletteWindow(): BrowserWindow | null {
  return paletteWindow
}

/**
 * hidePaletteForAction
 *
 * Used exclusively by the insert_text action executor.
 * Hides the window IMMEDIATELY (no animation delay) so the OS returns focus
 * to the previously active application as fast as possible.
 * The palette renderer still receives 'palette-hidden' for state cleanup,
 * but we don't wait 150 ms before calling .hide().
 */
export function hidePaletteForAction(): void {
  if (!paletteWindow?.isVisible()) return
  paletteWindow.webContents.send('palette-hidden')
  paletteWindow.hide()   // immediate — no setTimeout, no animation wait
}
