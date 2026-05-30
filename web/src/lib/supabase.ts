import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ── Browser client ────────────────────────────────────────────────────────────
// Use in client components ('use client')
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Server client ─────────────────────────────────────────────────────────────
// Use in API routes and server components
// Respects RLS — scoped to the authenticated user
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a server component — cookies can't be set, safe to ignore
          }
        },
      },
    }
  )
}

// ── User client ───────────────────────────────────────────────────────────────
// Use in API routes called by the Electron app
// Authenticates via a Bearer token (JWT) rather than cookies
// Respects RLS — scoped to the token owner
export function createUserClient(accessToken: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}

// ── Admin client ──────────────────────────────────────────────────────────────
// Uses service role key — bypasses RLS entirely
// NEVER use in client components or expose to the browser
// Only for trusted server-side operations (admin panel, background jobs)
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
