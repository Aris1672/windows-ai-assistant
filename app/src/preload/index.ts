/**
 * app/src/preload/index.ts
 */

import { contextBridge, ipcRenderer } from 'electron'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContextBundle {
  activeApp: string | null
  activeAppPath: string | null
  activeWindowTitle: string | null
  activeFilePath: string | null
  selectedText: string | null
  screenshotBase64: string | null
  capturedAt: string
}

export interface ContextClip {
  text:      string
  sourceApp: string | null
  filePath:  string | null
  addedAt:   string
}

export interface FileRef {
  filePath:  string
  fileName:  string
  content:   string
  truncated: boolean
}

export type StreamEvent =
  | { type: 'chunk'; data: string }
  | { type: 'done' }
  | { type: 'auth-error' }
  | { type: 'http-error'; status: number }
  | { type: 'error' }

export interface ApiResponse {
  ok: boolean
  status: number
  data: unknown
}

export type Action =
  | { type: 'insert_text';       text: string }
  | { type: 'copy_to_clipboard'; text: string }
  | { type: 'open_folder';       path: string }
  | { type: 'open_file';         path: string }
  | { type: 'open_url';          url: string  }

export interface ActionResult {
  ok: boolean
  error?: string
}

export interface ElectronAPI {
  // Window control
  hidePalette: () => void

  // Context snapshot
  getContext: () => Promise<ContextBundle>

  // Auth token (persisted in userData/store.json)
  getToken: () => Promise<string | null>
  setToken: (token: string | null) => void
  setRefreshToken: (token: string | null) => void

  // Navigation
  openDashboard: () => void

  // ── Generic API proxy (JSON request/response) ────────────────────────────
  apiRequest: (params: {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: object
  }) => Promise<ApiResponse>

  // ── Streaming API proxy (SSE) ────────────────────────────────────────────
  streamContext: (params: { url: string; token: string; body: object }) => void
  cancelStream: () => void
  onStreamEvent: (callback: (ev: StreamEvent) => void) => () => void

  // ── Action executor ──────────────────────────────────────────────────────
  executeAction: (action: Action, conversationId?: string | null) => Promise<ActionResult>

  // ── Context Tray ─────────────────────────────────────────────────────────
  trayGetClips:    () => Promise<ContextClip[]>
  trayAddClip:     (clip: ContextClip) => Promise<ContextClip[]>
  trayRemoveClip:  (index: number) => Promise<ContextClip[]>
  trayClear:       () => Promise<void>

  // ── File Reference Resolver ───────────────────────────────────────────────
  resolveFileRefs: (params: {
    query:          string
    activeFolder:   string | null
    activeFilePath: string | null
  }) => Promise<FileRef[]>

  // Events pushed from the main process
  onPaletteShown:  (callback: () => void) => () => void
  onPaletteHidden: (callback: () => void) => () => void
  onContextData:   (callback: (ctx: ContextBundle) => void) => () => void

  // ── Auto-updater ─────────────────────────────────────────────────────────
  onUpdaterEvent: (callback: (ev: Record<string, string>) => void) => () => void
  updaterInstall: () => void
}

// ─── Implementation ──────────────────────────────────────────────────────────

const api: ElectronAPI = {
  hidePalette: () => ipcRenderer.send('hide-palette'),

  getContext: () => ipcRenderer.invoke('get-context'),

  getToken: () => ipcRenderer.invoke('get-token'),
  setToken: (token) => ipcRenderer.send('set-token', token),
  setRefreshToken: (token) => ipcRenderer.send('set-refresh-token', token),

  openDashboard: () => ipcRenderer.send('open-dashboard'),

  // ── Generic API proxy ─────────────────────────────────────────────────────
  apiRequest: (params) => ipcRenderer.invoke('api-request', params),

  // ── Streaming API proxy ───────────────────────────────────────────────────
  streamContext: (params) => ipcRenderer.send('stream-context', params),
  cancelStream:  () => ipcRenderer.send('cancel-stream'),
  onStreamEvent: (cb) => {
    const fn = (_: Electron.IpcRendererEvent, ev: StreamEvent) => cb(ev)
    ipcRenderer.on('stream-event', fn)
    return () => ipcRenderer.off('stream-event', fn)
  },

  // ── Action executor ───────────────────────────────────────────────────────
  executeAction: (action, conversationId = null) =>
    ipcRenderer.invoke('execute-action', { action, conversationId }),

  // ── Context Tray ──────────────────────────────────────────────────────────
  trayGetClips:   ()        => ipcRenderer.invoke('tray-get-clips'),
  trayAddClip:    (clip)    => ipcRenderer.invoke('tray-add-clip', clip),
  trayRemoveClip: (index)   => ipcRenderer.invoke('tray-remove-clip', index),
  trayClear:      ()        => ipcRenderer.invoke('tray-clear'),

  // ── File Reference Resolver ───────────────────────────────────────────────
  resolveFileRefs: (params) => ipcRenderer.invoke('resolve-file-refs', params),

  // ── Main-process events ───────────────────────────────────────────────────
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
  },

  // ── Auto-updater ──────────────────────────────────────────────────────────
  onUpdaterEvent: (cb) => {
    const fn = (_: Electron.IpcRendererEvent, ev: Record<string, string>) => cb(ev)
    ipcRenderer.on('updater-event', fn)
    return () => ipcRenderer.off('updater-event', fn)
  },
  updaterInstall: () => ipcRenderer.send('updater-install'),
}

// Expose under window.electronAPI — never expose the raw ipcRenderer
contextBridge.exposeInMainWorld('electronAPI', api)
