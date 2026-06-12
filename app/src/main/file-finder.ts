/**
 * app/src/main/file-finder.ts
 *
 * Extracts file name references from a user query and searches
 * the file system to locate matching files.
 */

import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

const SUPPORTED_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.json',
  '.docx', '.xlsx', '.xls',
  '.pdf',
])

const DOC_KEYWORDS = [
  'report', 'document', 'doc', 'file', 'contract', 'invoice',
  'spreadsheet', 'presentation', 'proposal', 'brief', 'summary',
  'plan', 'budget', 'analysis', 'letter', 'memo', 'notes',
]

export interface FoundFile {
  filePath: string
  fileName: string
}

// ─── Extract candidate search terms from query ────────────────────────────────

export function extractFileNameCandidates(query: string): string[] {
  const candidates = new Set<string>()

  // 1. Quoted strings: "Q1 report" or 'financial summary'
  const quoted = query.match(/["']([^"']{2,60})["']/g)
  if (quoted) {
    quoted.forEach(q => candidates.add(q.replace(/["']/g, '').trim()))
  }

  // 2. Patterns like "the Q1 report", "our invoice", "last month's budget"
  const pattern = new RegExp(
    `([\\w\\s'-]{2,40})\\s+(?:${DOC_KEYWORDS.join('|')})`,
    'gi'
  )
  let match
  while ((match = pattern.exec(query)) !== null) {
    const term = match[1].trim().replace(/^(?:the|our|my|this|that|last|next|a|an)\s+/i, '')
    if (term.length >= 2) candidates.add(term)
  }

  // 3. Explicit file extensions mentioned: "Q1.pdf", "budget.xlsx"
  const withExt = query.match(/[\w\s'-]{2,40}\.(docx?|xlsx?|pdf|txt|md|csv)/gi)
  if (withExt) withExt.forEach(f => candidates.add(f.trim()))

  return [...candidates].filter(c => c.length >= 2).slice(0, 5)
}

// ─── Main search function ─────────────────────────────────────────────────────

export async function findFileRefs(
  query: string,
  activeFolder: string | null,
  activeFilePath: string | null
): Promise<FoundFile[]> {
  const candidates = extractFileNameCandidates(query)
  if (candidates.length === 0) return []

  // Build search locations in priority order
  const searchDirs: string[] = []
  if (activeFolder) searchDirs.push(activeFolder)
  if (activeFilePath) {
    const parent = path.dirname(activeFilePath)
    if (!searchDirs.includes(parent)) searchDirs.push(parent)
  }
  const home = os.homedir()
  searchDirs.push(
    path.join(home, 'Documents'),
    path.join(home, 'Desktop'),
    path.join(home, 'Downloads'),
  )

  const results: FoundFile[] = []
  const seen = new Set<string>()

  for (const dir of searchDirs) {
    for (const candidate of candidates) {
      const matches = await searchDir(dir, candidate, 2)
      for (const m of matches) {
        if (!seen.has(m.filePath)) {
          seen.add(m.filePath)
          results.push(m)
        }
      }
    }
    if (results.length >= 3) break
  }

  return results.slice(0, 3)
}

// ─── Recursive directory search ───────────────────────────────────────────────

async function searchDir(
  dir: string,
  candidate: string,
  maxDepth: number
): Promise<FoundFile[]> {
  const results: FoundFile[] = []
  if (maxDepth <= 0) return results

  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return results
  }

  const candidateLower = candidate.toLowerCase()

  // Check files at this level
  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase()
    if (SUPPORTED_EXTENSIONS.has(ext) && entry.toLowerCase().includes(candidateLower)) {
      results.push({ filePath: path.join(dir, entry), fileName: entry })
    }
  }

  // Recurse into subdirs if nothing found yet
  if (results.length === 0 && maxDepth > 1) {
    for (const entry of entries.slice(0, 30)) {
      if (entry.startsWith('.')) continue
      try {
        const fullPath = path.join(dir, entry)
        const stat = await fs.stat(fullPath)
        if (stat.isDirectory()) {
          const sub = await searchDir(fullPath, candidate, maxDepth - 1)
          results.push(...sub)
          if (results.length >= 3) break
        }
      } catch {
        // skip inaccessible dirs
      }
    }
  }

  return results
}
