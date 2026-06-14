import { NextRequest } from 'next/server'

// Electron makes requests from file:// or localhost — must allow cross-origin
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Browser sends a preflight OPTIONS request before the actual POST
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  let email: string, password: string

  try {
    const body = await req.json()
    email = body.email
    password = body.password
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS })
  }

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400, headers: CORS })
  }

  // Direct REST call — no Supabase JS client overhead (no session init, no auto-refresh setup)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabaseRes = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!supabaseRes.ok) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401, headers: CORS })
  }

  const session = await supabaseRes.json()

  if (!session.access_token) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401, headers: CORS })
  }

  return Response.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,   // ← was missing before
    expires_at: session.expires_at,
    user: {
      id: session.user.id,
      email: session.user.email,
    }
  }, { status: 200, headers: CORS })
}
