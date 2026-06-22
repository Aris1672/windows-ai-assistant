/**
 * app/src/preload/result.ts
 *
 * Minimal preload for the standalone result window.
 * Only exposes what the result page actually needs.
 */

import { contextBridge, ipcRenderer } from 'electron'

export interface ResultAPI {
  /** Receive the skill result payload from the main process */
  onPayload: (callback: (payload: { title: string; content: string }) => void) => () => void
  /** Close this window */
  close: () => void
  /** Open a URL in the user's default browser */
  openExternal: (url: string) => void
}

const api: ResultAPI = {
  onPayload: (cb) => {
    const fn = (_: Electron.IpcRendererEvent, payload: { title: string; content: string }) => cb(payload)
    ipcRenderer.on('result-payload', fn)
    return () => ipcRenderer.off('result-payload', fn)
  },

  close: () => ipcRenderer.send('close-result-window'),

  openExternal: (url) => ipcRenderer.send('open-external-url', url),
}

contextBridge.exposeInMainWorld('resultAPI', api)
