/**
 * POST /api/auth/refresh
 *
 * Exchanges a Supabase refresh_token for a new access_token + refresh_token.
 * Called by the Electron main process when a stream returns 401.
 * All traffic routed through Vercel for regional compliance.
 */

import { jsonError } from '@/lib/auth'

export async function POST(request: Request): Promise<Response> {
  let body: { refresh_token?: string }

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.refresh_token) {
    return jsonError('refresh_token is required', 400)
  }

  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnon) {
    return jsonError('Server configuration error', 500)
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':        supabaseAnon,
    },
    body: JSON.stringify({ refresh_token: body.refresh_token }),
  })

  if (!res.ok) {
    return jsonError('Token refresh failed — please sign in again', 401)
  }

  const data = await res.json() as {
    access_token:  string
    refresh_token: string
  }

  return Response.json({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
  })
}
