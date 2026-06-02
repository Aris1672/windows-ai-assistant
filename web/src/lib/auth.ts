import { createUserClient, createServerSupabaseClient } from './supabase'

export interface AuthUser {
  id: string
  email: string
  role: string
}

/**
 * Extracts the Bearer token from the Authorization header,
 * OR falls back to the Supabase session cookie (web dashboard).
 *
 * Traffic paths:
 *   Electron  → Vercel API route → Supabase   (Bearer token)
 *   Web (RU)  → Vercel API route → Supabase   (cookie session)
 *
 * Throws a 401 Response if neither path yields a valid user.
 */
export async function requireAuth(
  request: Request
): Promise<{ user: AuthUser; accessToken: string }> {
  const authHeader = request.headers.get('Authorization')

  // ── Bearer token path (Electron app) ───────────────────────────────────────
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.slice(7)
    const supabase = createUserClient(accessToken)

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      throw new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    return {
      user: { id: user.id, email: user.email ?? '', role: profile?.role ?? 'user' },
      accessToken,
    }
  }

  // ── Cookie path (web dashboard) ─────────────────────────────────────────────
  // No Bearer header — look for a Supabase session cookie instead.
  // createServerSupabaseClient reads cookies from the incoming request headers,
  // so this path only works in the context of a Vercel API route or Server Component.
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Pull the raw access token out of the session so that any downstream code
  // that calls createUserClient(accessToken) still works correctly.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Response(JSON.stringify({ error: 'Session token unavailable' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    user: { id: user.id, email: user.email ?? '', role: profile?.role ?? 'user' },
    accessToken: session.access_token,
  }
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
