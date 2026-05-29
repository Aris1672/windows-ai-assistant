import { createUserClient } from './supabase'

export interface AuthUser {
  id: string
  email: string
  role: string
}

/**
 * Extracts the Bearer token from the Authorization header,
 * verifies it with Supabase, and returns the user.
 * Throws a Response with 401 if invalid.
 */
export async function requireAuth(request: Request): Promise<{ user: AuthUser; accessToken: string }> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const accessToken = authHeader.slice(7)
  const supabase = createUserClient(accessToken)

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch role from public.users
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      role: profile?.role ?? 'user',
    },
    accessToken,
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
