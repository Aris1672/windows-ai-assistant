import { globalShortcut } from 'electron'

const HOTKEY = 'CommandOrControl+Space'

interface HotkeyOptions {
  onTrigger: () => void
}

export function registerHotkey(options: HotkeyOptions): boolean {
  const registered = globalShortcut.register(HOTKEY, options.onTrigger)

  if (!registered) {
    console.warn(
      `[Hotkey] Failed to register ${HOTKEY} — another application may already hold this shortcut.`
    )
  } else {
    console.log(`[Hotkey] ${HOTKEY} registered.`)
  }

  return registered
}

export function unregisterHotkey(): void {
  globalShortcut.unregister(HOTKEY)
}
