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

/**
 * captureVision controls whether the screen is captured at all.
 *
 * SECURITY: screen capture is NOT something we want to do unconditionally on
 * every hotkey press — the palette can be opened while sensitive content
 * (banking, passwords, private messages) is visible behind it. Capture only
 * happens when the caller explicitly asks for it:
 *   - the user has the "auto screen access" preference enabled, or
 *   - the user pressed the "Read my screen" button for this one query.
 *
 * Default is false. Callers must opt in deliberately, not by omission.
 */
export async function getContext(captureVision: boolean = false): Promise<ContextBundle> {
  const [windowInfo, selectedText, screenshotBase64] = await Promise.all([
    getActiveWindow(),
    captureSelectedText(),
    captureVision ? captureScreenshot() : Promise.resolve(null),
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

export async function captureScreenshot(): Promise<string | null> {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 800 },
    })

    if (!sources.length) return null

    const png = sources[0].thumbnail.toPNG()
    if (!png.length) return null

    return png.toString('base64')
  } catch {
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
  try {
    const { default: activeWin } = await import('active-win')
    const result = await activeWin()
    if (result) return result as WindowInfo
  } catch {
    // fall back to PowerShell
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
  try {
    const text = clipboard.readText()
    return text?.trim() || null
  } catch {
    return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fast path: some apps (VS Code, Notepad++, etc.) embed the full path in
 *  their window title. */
function extractFilePath(title: string | null): string | null {
  if (!title) return null
  const match = title.match(/[A-Za-z]:\\[^\s|—–]+|\\\\[^\s|—–]+/)
  if (match) return match[0]
  return null
}

/** Slow-path fallback: query the process command line via WMI.
 *
 *  Apps like OpenOffice/LibreOffice show only "filename.doc - OpenOffice Writer"
 *  in the title, but their process was launched with the full path as a CLI arg:
 *    soffice.bin "C:\Users\Ivan\Documents\contract.docx"
 *
 *  We use -EncodedCommand (base64 UTF-16LE) to send the PowerShell script so
 *  that regex special characters survive the JS → shell → PowerShell journey
 *  without any escaping distortion. */
async function extractFilePathFromProcess(processName: string | null): Promise<string | null> {
  if (!processName) return null

  // Sanitise before embedding in the PowerShell string literal
  const safeName = processName.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 60)
  if (!safeName) return null

  // Build the PowerShell script as a plain string — no shell escaping needed
  // because it will be base64-encoded and passed via -EncodedCommand.
  const ps = `
$ext = 'doc|docx|odt|ods|odp|xls|xlsx|ppt|pptx|pdf|txt|csv|rtf|md'
$procs = Get-WmiObject Win32_Process | Where-Object {
  $_.Name -like '${safeName}*' -and $_.CommandLine -ne $null
}
foreach ($p in $procs) {
  # Try quoted path first: "C:\\path\\file.ext"
  $m = [regex]::Match($p.CommandLine, '"([A-Za-z]:\\\\[^"]+\\.(' + $ext + '))"')
  if ($m.Success) { Write-Output $m.Groups[1].Value; exit }
  # Try unquoted path: C:\\path\\file.ext (no spaces)
  $m = [regex]::Match($p.CommandLine, '([A-Za-z]:\\\\\\S+\\.(' + $ext + '))')
  if ($m.Success) { Write-Output $m.Groups[1].Value; exit }
}
`.trim()

  // Encode as UTF-16LE — that is what PowerShell -EncodedCommand expects
  const encoded = Buffer.from(ps, 'utf16le').toString('base64')

  try {
    const { stdout } = await execAsync(
      `powershell -NonInteractive -NoProfile -EncodedCommand ${encoded}`,
      { timeout: 3000 }
    )
    const result = stdout.trim()
    return result || null
  } catch {
    return null
  }
}
