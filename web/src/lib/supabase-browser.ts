// ── Browser client ────────────────────────────────────────────────────────────
// Use this in client components ('use client')
// No server-only imports — safe to bundle on the client side

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
