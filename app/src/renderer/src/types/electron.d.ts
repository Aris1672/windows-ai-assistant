import type { ElectronAPI, ContextBundle, Action } from '../../../preload'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export type { ContextBundle, Action }
