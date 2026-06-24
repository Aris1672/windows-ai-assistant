import type { ElectronAPI, ContextBundle, Action } from '../../../preload'

// Minimal constructor type for Web Speech API — not in all TS lib targets
type SpeechRecognitionConstructor = new () => SpeechRecognition

declare global {
  interface Window {
    electronAPI: ElectronAPI
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}

export type { ContextBundle, Action }
