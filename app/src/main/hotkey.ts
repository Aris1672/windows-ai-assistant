import { globalShortcut } from 'electron'
import { store } from './store'

const DEFAULT_HOTKEY = 'CommandOrControl+Space'

// Keep track of the active hotkey and trigger so we can re-register dynamically
let currentHotkey  = DEFAULT_HOTKEY
let currentTrigger: (() => void) | null = null

interface HotkeyOptions {
  onTrigger: () => void
}

export function registerHotkey(options: HotkeyOptions): boolean {
  currentTrigger = options.onTrigger
  currentHotkey  = store.getHotkey()   // read persisted value (or default)

  const registered = globalShortcut.register(currentHotkey, currentTrigger)

  if (!registered) {
    console.warn(`[Hotkey] Failed to register ${currentHotkey} — another app may hold this shortcut.`)
  } else {
    console.log(`[Hotkey] ${currentHotkey} registered.`)
  }

  return registered
}

export function unregisterHotkey(): void {
  globalShortcut.unregister(currentHotkey)
}

/**
 * Re-register the global shortcut with a new accelerator string.
 * Called from the IPC handler when the user saves a new hotkey in Settings.
 * Returns true if registration succeeded, false if the combo is already taken.
 */
export function reregisterHotkey(newHotkey: string): boolean {
  if (!currentTrigger) return false

  globalShortcut.unregister(currentHotkey)

  const registered = globalShortcut.register(newHotkey, currentTrigger)

  if (registered) {
    currentHotkey = newHotkey
    console.log(`[Hotkey] Re-registered as ${newHotkey}`)
  } else {
    // Roll back — re-register the old hotkey so the app still works
    globalShortcut.register(currentHotkey, currentTrigger)
    console.warn(`[Hotkey] Failed to register ${newHotkey} — rolled back to ${currentHotkey}`)
  }

  return registered
}
