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

// ─── Dismissed workflow patterns ──────────────────────────────────────────────

interface DismissedPattern {
  hash:        string   // deterministic hash of pattern name
  dismissedAt: string   // ISO timestamp — re-shows after 7 days
}

// ─── Store schema ─────────────────────────────────────────────────────────────

interface StoreData {
  authToken?:         string
  refreshToken?:      string
  userEmail?:         string
  contextTray?:       ContextClip[]
  hotkey?:            string   // Electron accelerator, e.g. "CommandOrControl+Space"
  dismissedPatterns?: DismissedPattern[]
  autoVision?:        boolean  // if true, screenshot is captured automatically on every palette open. Default false — user must opt in or use the manual "Read my screen" button.
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

  // ── Auto-vision helpers ────────────────────────────────────────────────────
  // Default OFF — screen is only captured automatically if the user has
  // explicitly opted in via the settings toggle. Otherwise capture only
  // happens on demand via the "Read my screen" button.

  getAutoVision(): boolean {
    return read().autoVision ?? false
  },

  setAutoVision(enabled: boolean): void {
    write({ ...read(), autoVision: enabled })
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

  // ── Workflow pattern dismiss helpers ──────────────────────────────────────

  /**
   * Returns true if this pattern hash was dismissed less than 7 days ago.
   * Automatically prunes expired entries on each call.
   */
  isPatternDismissed(hash: string): boolean {
    const data = read()
    const now  = Date.now()
    const TTL  = 7 * 24 * 60 * 60 * 1000  // 7 days in ms

    // Prune expired dismissals while we're here
    const active = (data.dismissedPatterns ?? []).filter(
      p => now - new Date(p.dismissedAt).getTime() < TTL
    )

    const isDismissed = active.some(p => p.hash === hash)

    // Write pruned list back if anything changed
    if (active.length !== (data.dismissedPatterns ?? []).length) {
      write({ ...data, dismissedPatterns: active })
    }

    return isDismissed
  },

  dismissPattern(hash: string): void {
    const data    = read()
    const now     = Date.now()
    const TTL     = 7 * 24 * 60 * 60 * 1000
    const active  = (data.dismissedPatterns ?? []).filter(
      p => now - new Date(p.dismissedAt).getTime() < TTL
    )
    // Upsert — replace existing hash if present, add if not
    const updated = active.filter(p => p.hash !== hash)
    updated.push({ hash, dismissedAt: new Date().toISOString() })
    write({ ...data, dismissedPatterns: updated })
  },
}
