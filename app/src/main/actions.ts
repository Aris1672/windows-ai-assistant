/**
 * app/src/main/actions.ts
 *
 * Executes system actions on behalf of the AI.
 * Called from the 'execute-action' IPC handler in index.ts.
 *
 * Action types:
 *   insert_text       — writes to clipboard, hides palette, pastes via Ctrl+V  (requires confirm)
 *   copy_to_clipboard — writes to clipboard silently                            (no confirm)
 *   open_folder       — opens folder in Explorer                                (no confirm)
 *   open_file         — opens file with default app                             (no confirm)
 *   open_url          — opens URL in default browser                            (no confirm)
 */

import { app, shell, clipboard, dialog } from 'electron'
import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { hidePaletteForAction } from './windows'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'insert_text';       text: string }
  | { type: 'copy_to_clipboard'; text: string }
  | { type: 'open_folder';       path: string }
  | { type: 'open_file';         path: string }
  | { type: 'open_url';          url: string  }
  | { type: 'save_file';         filename: string; content: string }

/** Actions marked true must show a confirmation button before executing. */
export const ACTION_REQUIRES_CONFIRM: Record<Action['type'], boolean> = {
  insert_text:       true,
  copy_to_clipboard: false,
  open_folder:       false,
  open_file:         false,
  open_url:          false,
  save_file:         true,
}

/** Human-readable label shown on the action button in the palette. */
export const ACTION_LABELS: Record<Action['type'], string> = {
  insert_text:       'Insert text',
  copy_to_clipboard: 'Copy to clipboard',
  open_folder:       'Open folder',
  open_file:         'Open file',
  open_url:          'Open URL',
  save_file:         'Save file',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Runs a PowerShell one-liner.
 * Used only for SendKeys (paste simulation) — no native module required.
 */
function runPowerShell(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(
      `powershell -NoProfile -NonInteractive -Command "${command.replace(/"/g, '\\"')}"`,
      (err) => (err ? reject(err) : resolve())
    )
  })
}

// ─── Executor ─────────────────────────────────────────────────────────────────

export async function executeAction(action: Action): Promise<void> {
  switch (action.type) {

    // ── Insert text at cursor ──────────────────────────────────────────────
    // 1. Write text to clipboard
    // 2. Hide palette IMMEDIATELY (no animation delay) so the source window
    //    regains focus as fast as possible
    // 3. Wait for OS focus switch — 400 ms is reliable on Windows; the
    //    animation-delay version used 250 ms which was too tight (100 ms
    //    between actual hide and SendKeys caused pastes into wrong window)
    // 4. Simulate Ctrl+V via PowerShell SendKeys
    case 'insert_text': {
      clipboard.writeText(action.text)
      hidePaletteForAction()        // hides window immediately, no 150 ms delay
      await sleep(400)              // give Windows time to restore focus to previous app
      await runPowerShell(
        'Add-Type -AssemblyName System.Windows.Forms; ' +
        '[System.Windows.Forms.SendKeys]::SendWait("^v")'
      )
      break
    }

    // ── Copy to clipboard (silent, no paste) ──────────────────────────────
    case 'copy_to_clipboard': {
      clipboard.writeText(action.text)
      break
    }

    // ── Open folder or file ───────────────────────────────────────────────
    case 'open_folder':
    case 'open_file': {
      const result = await shell.openPath(action.path)
      if (result) {
        // shell.openPath returns an error string on failure, empty string on success
        throw new Error(`Could not open path: ${result}`)
      }
      break
    }

    // ── Open URL ──────────────────────────────────────────────────────────
    case 'open_url': {
      await shell.openExternal(action.url)
      break
    }

    // ── Save file to disk ──────────────────────────────────────────────────
    // Shows a native Save dialog so the user picks the exact location.
    // Defaults to the user's Downloads folder with the AI-suggested filename.
    case 'save_file': {
      const downloadsPath = app.getPath('downloads')
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Save file',
        defaultPath: path.join(downloadsPath, action.filename),
        buttonLabel: 'Save',
      })
      if (canceled || !filePath) break
      await fs.promises.writeFile(filePath, action.content, 'utf-8')
      await shell.openPath(path.dirname(filePath))
      break
    }
  }
}
