import { NextResponse } from 'next/server'

// ─── Update this URL with every new release ───────────────────────────────────
// Path: web/src/app/api/download/route.ts
const LATEST_VERSION = 'v0.7.0'
const INSTALLER_NAME = `AI-Assistant-Setup-0.7.0.exe`
const DOWNLOAD_URL   = `https://github.com/Aris1672/windows-ai-assistant/releases/download/${LATEST_VERSION}/${INSTALLER_NAME}`
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.redirect(DOWNLOAD_URL, { status: 302 })
}
