import { contextBridge, ipcRenderer } from 'electron'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContextBundle {
  activeApp: string | null
  activeAppPath: string | null
  activeWindowTitle: string | null
  activeFilePath: string | null
  selectedText: string | null
  capturedAt: string
}

export interface ElectronAPI {
  // Window control
  hidePalette: () => void

  // Context snapshot
  getContext: () => Promise<ContextBundle>

  // Auth token (persisted in userData/store.json)
  getToken: () => Promise<string | null>
  setToken: (token: string | null) => void

  // Navigation
  openDashboard: () => void

  // Events pushed from the main process
  onPaletteShown: (callback: () => void) => () => void
  onPaletteHidden: (callback: () => void) => () => void
  onContextData: (callback: (ctx: ContextBundle) => void) => () => void
}

// ─── Implementation ──────────────────────────────────────────────────────────

const api: ElectronAPI = {
  hidePalette: () => ipcRenderer.send('hide-palette'),

  getContext: () => ipcRenderer.invoke('get-context'),

  getToken: () => ipcRenderer.invoke('get-token'),
  setToken: (token) => ipcRenderer.send('set-token', token),

  openDashboard: () => ipcRenderer.send('open-dashboard'),

  onPaletteShown: (cb) => {
    const fn = () => cb()
    ipcRenderer.on('palette-shown', fn)
    return () => ipcRenderer.off('palette-shown', fn)
  },

  onPaletteHidden: (cb) => {
    const fn = () => cb()
    ipcRenderer.on('palette-hidden', fn)
    return () => ipcRenderer.off('palette-hidden', fn)
  },

  onContextData: (cb) => {
    const fn = (_: Electron.IpcRendererEvent, ctx: ContextBundle) => cb(ctx)
    ipcRenderer.on('context-data', fn)
    return () => ipcRenderer.off('context-data', fn)
  }
}

// Expose under window.electronAPI — never expose the raw ipcRenderer
contextBridge.exposeInMainWorld('electronAPI', api)
