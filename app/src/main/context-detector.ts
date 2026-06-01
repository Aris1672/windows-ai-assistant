import { clipboard } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ContextBundle {
  activeApp: string | null         // e.g. "Code", "Outlook", "Excel"
  activeAppPath: string | null     // e.g. "C:\\Program Files\\..."
  activeWindowTitle: string | null // e.g. "main.ts — my-project — VS Code"
  activeFilePath: string | null    // extracted from title where possible
  selectedText: string | null      // currently highlighted text
  capturedAt: string               // ISO timestamp
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getContext(): Promise<ContextBundle> {
  const [windowInfo, selectedText] = await Promise.all([
    getActiveWindow(),
    captureSelectedText()
  ])

  return {
    activeApp: windowInfo?.owner?.name ?? null,
    activeAppPath: windowInfo?.owner?.path ?? null,
    activeWindowTitle: windowInfo?.title ?? null,
    activeFilePath: extractFilePath(windowInfo?.title ?? null),
    selectedText,
    capturedAt: new Date().toISOString()
  }
}

// ─── Active Window ───────────────────────────────────────────────────────────

interface WindowInfo {
  title: string
  owner: {
    name: string
    path: string
  }
}

async function getActiveWindow(): Promise<WindowInfo | null> {
  // Try active-win first (cross-platform, uses prebuilt binaries)
  try {
    const { default: activeWin } = await import('active-win')
    const result = await activeWin()
    if (result) return result as WindowInfo
  } catch {
    // active-win may not be available on all setups — fall back to PowerShell
  }

  // PowerShell fallback (Windows only)
  return getActiveWindowPowerShell()
}

async function getActiveWindowPowerShell(): Promise<WindowInfo | null> {
  const script = `
    Add-Type @"
      using System;
      using System.Runtime.InteropServices;
      public class Win32 {
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
      }
"@
    $hwnd = [Win32]::GetForegroundWindow()
    $proc = Get-Process | Where-Object { $_.MainWindowHandle -eq $hwnd } | Select-Object -First 1
    if ($proc) {
      @{
        title = $proc.MainWindowTitle
        ownerName = $proc.ProcessName
        ownerPath = $proc.Path
      } | ConvertTo-Json
    }
  `.trim()

  try {
    const { stdout } = await execAsync(
      `powershell -NonInteractive -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
      { timeout: 2000 }
    )
    const raw = JSON.parse(stdout.trim())
    return {
      title: raw.title ?? '',
      owner: { name: raw.ownerName ?? '', path: raw.ownerPath ?? '' }
    }
  } catch {
    return null
  }
}

// ─── Selected Text ───────────────────────────────────────────────────────────

async function captureSelectedText(): Promise<string | null> {
  // Save the current clipboard so we can restore it
  const previous = clipboard.readText()

  try {
    // Simulate Ctrl+C to copy whatever is selected
    // Requires @nut-tree/nut-js in Phase 3 enhancement.
    // For now, we read the clipboard as-is — the user's last copy counts as context.
    // TODO: Replace with keyboard simulation for true selection capture:
    //   import { keyboard, Key } from '@nut-tree/nut-js'
    //   await keyboard.pressKey(Key.LeftControl, Key.C)
    //   await keyboard.releaseKey(Key.LeftControl, Key.C)
    //   await new Promise(r => setTimeout(r, 80))

    const text = clipboard.readText()
    return text?.trim() || null
  } catch {
    return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Attempts to extract a file path from a window title.
 * Works for VS Code ("file.ts — folder — VS Code"), Notepad ("file.txt — Notepad"), etc.
 */
function extractFilePath(title: string | null): string | null {
  if (!title) return null

  // Absolute Windows path pattern: C:\something or \\network\something
  const match = title.match(/[A-Za-z]:\\[^\s|—–]+|\\\\[^\s|—–]+/)
  if (match) return match[0]

  return null
}
