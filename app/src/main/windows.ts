import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import type { ContextBundle } from './context-detector'

let paletteWindow: BrowserWindow | null = null

// ─── Creation ────────────────────────────────────────────────────────────────

export function createPaletteWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const paletteHeight = Math.round(height * 0.88)

  paletteWindow = new BrowserWindow({
    width: 680,
    height: paletteHeight || 900, // fallback in case screen API isn't ready
    x: Math.round((width - 680) / 2),
    y: Math.round(height * 0.06),  // ~6% from the top — gives room for 80vh palette
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

  //paletteWindow.webContents.openDevTools({ mode: 'detach' })

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

  const paletteHeight = Math.round(height * 0.88)
  paletteWindow.setSize(680, paletteHeight)
  paletteWindow.setPosition(
    x + Math.round((width - 680) / 2),
    y + Math.round(height * 0.06)
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


// ─── Pin Window ───────────────────────────────────────────────────────────────

let pinWindow: BrowserWindow | null = null

const PIN_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 100%; height: 100%;
    background: transparent;
  }
  .shell {
    width: 100%; height: 100%;
    background: rgba(16, 16, 22, 0.97);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: rgba(255,255,255,0.82);
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
    -webkit-app-region: drag;
  }
  .title {
    font-size: 11px;
    font-weight: 600;
    color: rgba(251,191,36,0.85);
    display: flex;
    align-items: center;
    gap: 5px;
    letter-spacing: 0.02em;
  }
  .btns {
    display: flex;
    gap: 5px;
    -webkit-app-region: no-drag;
  }
  button {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 5px;
    cursor: pointer;
    font-size: 11px;
    padding: 3px 9px;
    transition: background 0.12s;
  }
  .copy { color: rgba(0,245,160,0.85); border-color: rgba(0,245,160,0.18); }
  .copy:hover { background: rgba(0,245,160,0.12); }
  .close { color: rgba(255,90,90,0.85); border-color: rgba(255,90,90,0.18); }
  .close:hover { background: rgba(255,90,90,0.12); }
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 10px 12px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12.5px;
    -webkit-app-region: no-drag;
    user-select: text;
  }
  .content::-webkit-scrollbar { width: 4px; }
  .content::-webkit-scrollbar-track { background: transparent; }
  .content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px; }
</style>
</head>
<body>
<div class="shell">
  <div class="header">
    <div class="title">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 3a1 1 0 0 1 .707 1.707L13 8.414V13l3 3v2h-4v4l-1 1-1-1v-4H6v-2l3-3V8.414L5.293 4.707A1 1 0 0 1 6 3h10z"/>
      </svg>
      Pinned
    </div>
    <div class="btns">
      <button class="copy" onclick="copyText()">Copy</button>
      <button class="close" onclick="window.close()">✕</button>
    </div>
  </div>
  <div class="content" id="content"></div>
</div>
<script>
  function copyText() {
    const text = document.getElementById("content").textContent || "";
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    const btn = document.querySelector(".copy");
    btn.textContent = "Copied!";
    setTimeout(() => btn.textContent = "Copy", 1500);
  }
  window.addEventListener("keydown", e => { if (e.key === "Escape") window.close(); });
</script>
</body>
</html>`

export function openPinWindow(text: string): void {
  // If already open, update content and bring to front
  if (pinWindow && !pinWindow.isDestroyed()) {
    pinWindow.webContents.executeJavaScript(
      `document.getElementById('content').textContent = ${JSON.stringify(text)}`
    )
    pinWindow.show()
    pinWindow.focus()
    return
  }

  const { width } = screen.getPrimaryDisplay().workAreaSize

  pinWindow = new BrowserWindow({
    width: 340,
    height: 300,
    x: width - 360,
    y: 20,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    movable: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // No preload needed — pin window is self-contained HTML
    }
  })

  pinWindow.loadURL(
    'data:text/html;charset=utf-8,' + encodeURIComponent(PIN_HTML)
  )

  pinWindow.webContents.on('did-finish-load', () => {
    pinWindow?.webContents.executeJavaScript(
      `document.getElementById('content').textContent = ${JSON.stringify(text)}`
    )
    pinWindow?.show()
  })

  pinWindow.on('closed', () => {
    pinWindow = null
  })
}

export function closePinWindow(): void {
  if (pinWindow && !pinWindow.isDestroyed()) {
    pinWindow.close()
  }
  pinWindow = null
}
