import type { ElectronAPI, ContextBundle } from '../../../preload'

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export type { ContextBundle }
