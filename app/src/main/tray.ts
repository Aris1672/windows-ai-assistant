import { Tray, Menu, nativeImage, shell } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

interface TrayOptions {
  onShowPalette: () => void
  onQuit: () => void
}

export function createTray(options: TrayOptions): void {
  // resources/tray-icon.png — 16×16 or 32×32 PNG (white/light icon for dark taskbar)
  const iconPath = join(__dirname, '../../resources/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon.resize({ width: 16, height: 16 }))

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Palette',
      accelerator: 'Ctrl+Space',
      click: options.onShowPalette
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => shell.openExternal(process.env['VITE_WEB_URL'] ?? 'https://your-app.vercel.app/dashboard')
    },
    { type: 'separator' },
    {
      label: 'Quit AI Assistant',
      click: options.onQuit
    }
  ])

  tray.setToolTip('AI Assistant  ·  Ctrl+Space')
  tray.setContextMenu(menu)

  // Double-click the tray icon to show palette
  tray.on('double-click', options.onShowPalette)
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
