import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

// ─── Context Tray ─────────────────────────────────────────────────────────────

export interface ContextClip {
  text:       string
  sourceApp:  string | null
  filePath:   string | null
  addedAt:    string   // ISO timestamp
}

// ─── Store schema ─────────────────────────────────────────────────────────────

interface StoreData {
  authToken?:     string
  refreshToken?:  string
  userEmail?:     string
  contextTray?:   ContextClip[]
  hotkey?:        string   // Electron accelerator, e.g. "CommandOrControl+Space"
}

function getStorePath(): string {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return join(dir, 'store.json')
}

function read(): StoreData {
  const path = getStorePath()
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

function write(data: StoreData): void {
  writeFileSync(getStorePath(), JSON.stringify(data, null, 2), 'utf-8')
}

export const store = {
  get<K extends keyof StoreData>(key: K, defaultValue?: StoreData[K]): StoreData[K] | undefined {
    return read()[key] ?? defaultValue
  },
  set<K extends keyof StoreData>(key: K, value: StoreData[K]): void {
    write({ ...read(), [key]: value })
  },
  delete<K extends keyof StoreData>(key: K): void {
    const data = read()
    delete data[key]
    write(data)
  },

  // ── Hotkey helpers ────────────────────────────────────────────────────────

  getHotkey(): string {
    return read().hotkey ?? 'CommandOrControl+Space'
  },

  setHotkey(hotkey: string): void {
    write({ ...read(), hotkey })
  },

  // ── Context Tray helpers ──────────────────────────────────────────────────
  trayGetClips(): ContextClip[] {
    return read().contextTray ?? []
  },

  trayAddClip(clip: ContextClip): ContextClip[] {
    const data = read()
    const tray = data.contextTray ?? []
    // Cap at 10 clips — drop oldest if full
    const updated = [...tray, clip].slice(-10)
    write({ ...data, contextTray: updated })
    return updated
  },

  trayRemoveClip(index: number): ContextClip[] {
    const data = read()
    const tray = (data.contextTray ?? []).filter((_, i) => i !== index)
    write({ ...data, contextTray: tray })
    return tray
  },

  trayClear(): void {
    const data = read()
    write({ ...data, contextTray: [] })
  },
}
