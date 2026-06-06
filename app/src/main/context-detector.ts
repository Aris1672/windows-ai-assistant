import { clipboard, desktopCapturer } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ContextBundle {
  activeApp: string | null          // e.g. "Code", "Outlook", "Excel"
  activeAppPath: string | null      // e.g. "C:\\Program Files\\..."
  activeWindowTitle: string | null  // e.g. "main.ts — my-project — VS Code"
  activeFilePath: string | null     // extracted from title, or from process command line
  selectedText: string | null       // currently highlighted text
  screenshotBase64: string | null   // base64 PNG of the primary screen at capture time
  capturedAt: string                // ISO timestamp
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getContext(): Promise<ContextBundle> {
  // Capture all three in parallel — screenshot must happen BEFORE the palette
  // window is shown (caller guarantees this: getContext() → showPalette()).
  const [windowInfo, selectedText, screenshotBase64] = await Promise.all([
    getActiveWindow(),
    captureSelectedText(),
    captureScreenshot(),
  ])

  // Try to get the file path from the window title first (works for VS Code,
  // Notepad++, etc.). If that fails, fall back to querying the process command
  // line via WMI — this catches apps like OpenOffice/LibreOffice that show only
  // the filename in their title bar, not the full path.
  const titlePath = extractFilePath(windowInfo?.title ?? null)
  const activeFilePath = titlePath
    ?? await extractFilePathFromProcess(windowInfo?.owner?.name ?? null)

  return {
    activeApp: windowInfo?.owner?.name ?? null,
    activeAppPath: windowInfo?.owner?.path ?? null,
    activeWindowTitle: windowInfo?.title ?? null,
    activeFilePath,
    selectedText,
    screenshotBase64,
    capturedAt: new Date().toISOString(),
  }
}

// ─── Screenshot ───────────────────────────────────────────────────────────────
// Uses Electron's desktopCapturer to grab the primary screen as a PNG.
// Thumbnail is capped at 1280 × 800 — enough detail for Claude Vision,
// small enough to keep latency low (~200–500 KB base64 for a typical screen).
// Returns null on any failure so the rest of the context still works.

async function captureScreenshot(): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 800 },
    })

    if (!sources.length) return null

    // sources[0] is always the primary / full-desktop source
    const png = sources[0].thumbnail.toPNG()
    if (!png.length) return null

    return png.toString('base64')
  } catch {
    // desktopCapturer can fail if the app lacks screen-capture permission
    // (rare on Windows, possible on macOS). Non-fatal — return null.
    return null
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
      owner: { name: raw.ownerName ?? '', path: raw.ownerPath ?? '' },
    }
  } catch {
    return null
  }
}

// ─── Selected Text ───────────────────────────────────────────────────────────

async function captureSelectedText(): Promise<string | null> {
  const previous = clipboard.readText()

  try {
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

/** Fast path: some apps (VS Code, Notepad++, etc.) embed the full path in
 *  their window title. Regex looks for drive-letter paths and UNC paths. */
function extractFilePath(title: string | null): string | null {
  if (!title) return null
  const match = title.match(/[A-Za-z]:\\[^\s|—–]+|\\\\[^\s|—–]+/)
  if (match) return match[0]
  return null
}

/** Slow path: query the process command line via WMI.
 *  Works for apps like OpenOffice / LibreOffice that show only the filename
 *  in their title bar but pass the full path as a CLI argument when opening
 *  a file. Times out gracefully and returns null on any failure. */
async function extractFilePathFromProcess(processName: string | null): Promise<string | null> {
  if (!processName) return null

  // Escape the process name for safe embedding in PowerShell
  const safeName = processName.replace(/[^a-zA-Z0-9._-]/g, '')
  if (!safeName) return null

  // WMI CommandLine contains the full argv, e.g.:
  //   "C:\Program Files\LibreOffice\program\swriter.exe" "C:\Users\Ivan\Docs\contract.docx"
  // We extract the first argument that looks like a document path.
  const script = `
    $proc = Get-WmiObject Win32_Process -Filter "Name LIKE '${safeName}%'" | Select-Object -First 1
    if ($proc -and $proc.CommandLine) {
      $m = [regex]::Match($proc.CommandLine, '[A-Za-z]:\\\\(?:[^"\\\\]+\\\\)*[^"\\\\]+\\.(?:doc|docx|odt|ods|odp|xls|xlsx|ppt|pptx|pdf|txt|csv|rtf|md)')
      if ($m.Success) { $m.Value }
    }
  `.trim()

  try {
    const { stdout } = await execAsync(
      `powershell -NonInteractive -NoProfile -Command "${script.replace(/"/g, '\\"')}"`,
      { timeout: 2500 }
    )
    const path = stdout.trim()
    return path || null
  } catch {
    return null
  }
}
