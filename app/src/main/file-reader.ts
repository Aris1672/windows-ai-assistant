/**
 * app/src/main/file-reader.ts
 *
 * Reads and extracts text content from files of supported types.
 * Used by the file-as-context feature to feed document content to Claude.
 */

import { promises as fs } from 'fs'
import * as path from 'path'

const MAX_CHARS = 12000 // ~3,000 tokens — keeps context focused

export interface FileContent {
  filePath:  string
  fileName:  string
  content:   string
  truncated: boolean
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function readFileContent(filePath: string): Promise<FileContent | null> {
  const ext      = path.extname(filePath).toLowerCase()
  const fileName = path.basename(filePath)

  try {
    let content: string | null = null

    if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
      content = await readText(filePath)
    } else if (ext === '.docx') {
      content = await readDocx(filePath)
    } else if (ext === '.pdf') {
      content = await readPdf(filePath)
    } else if (['.xlsx', '.xls'].includes(ext)) {
      content = await readXlsx(filePath)
    }

    if (!content?.trim()) return null

    const truncated    = content.length > MAX_CHARS
    const finalContent = truncated
      ? content.slice(0, MAX_CHARS) + '\n\n[... content truncated for length ...]'
      : content

    return { filePath, fileName, content: finalContent, truncated }
  } catch {
    return null
  }
}

// ─── Readers ──────────────────────────────────────────────────────────────────

async function readText(filePath: string): Promise<string> {
  return await fs.readFile(filePath, 'utf-8')
}

async function readDocx(filePath: string): Promise<string | null> {
  try {
    const mammoth = await import('mammoth')
    const buffer  = await fs.readFile(filePath)
    const result  = await mammoth.extractRawText({ buffer })
    return result.value || null
  } catch {
    return null
  }
}

async function readPdf(filePath: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse')
    const buffer   = await fs.readFile(filePath)
    const result   = await pdfParse(buffer)
    return result.text || null
  } catch {
    return null
  }
}

async function readXlsx(filePath: string): Promise<string | null> {
  try {
    const XLSX  = await import('xlsx')
    const wb    = XLSX.readFile(filePath)
    const lines: string[] = []
    for (const sheetName of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName])
      lines.push(`[Sheet: ${sheetName}]\n${csv}`)
    }
    return lines.join('\n\n') || null
  } catch {
    return null
  }
}
