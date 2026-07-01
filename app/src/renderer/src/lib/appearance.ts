// app/src/renderer/src/lib/appearance.ts

import type { AppearanceSettings } from '../types/electron'

export type { AppearanceSettings }
export type ThemeMode = AppearanceSettings['theme']
export type UiScale = AppearanceSettings['uiScale']

// Matches your current --accent default exactly — existing beta users see
// ZERO visual change until they open Settings → Appearance.
export const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: 'dark',
  accentColor: '#0FFFD4',
  uiScale: 'comfortable',
}

export const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: 'Teal',    value: '#0FFFD4' }, // current default
  { name: 'Amber',   value: '#F59E0B' },
  { name: 'Violet',  value: '#8B5CF6' },
  { name: 'Rose',    value: '#F43F5E' },
  { name: 'Sky',     value: '#38BDF8' },
  { name: 'Emerald', value: '#22C55E' },
]

// html { font-size: X% } — since every spacing/type value in globals.css is
// rem-based, scaling the root font-size scales the whole UI (padding, text,
// chip sizes) in one move. No per-component density logic needed.
const SCALE_PERCENT: Record<UiScale, string> = {
  compact: '92%',
  comfortable: '100%',
  large: '110%',
}

/**
 * Applies appearance settings to the document root:
 *  - data-theme attribute → toggles the [data-theme='light'] override block in globals.css
 *  - root font-size → scales the whole rem-based UI
 *  - --accent and its derived shades → re-themes every element that already
 *    uses var(--accent) (badges, focus rings, caret, buttons, active states)
 *    with zero changes needed elsewhere in the CSS.
 *
 * Call once on mount (after loading saved prefs) and again on every change
 * for instant live preview.
 */
export function applyAppearance(settings: AppearanceSettings, root: HTMLElement = document.documentElement) {
  root.dataset.theme = settings.theme
  root.style.fontSize = SCALE_PERCENT[settings.uiScale]

  const { r, g, b } = hexToRgb(settings.accentColor)
  root.style.setProperty('--accent', settings.accentColor)
  root.style.setProperty('--accent-hover', rgbToHex(Math.round(r * 0.91), Math.round(g * 0.91), Math.round(b * 0.91)))
  root.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, 0.07)`)
  root.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.18)`)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`
}
