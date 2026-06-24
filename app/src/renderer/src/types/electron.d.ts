import type { ElectronAPI, ContextBundle, Action } from '../../../preload'

declare global {
  interface Window {
    electronAPI: ElectronAPI
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export type { ContextBundle, Action }
