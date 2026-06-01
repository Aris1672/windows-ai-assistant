import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Electron makes requests from file:// or localhost — must allow cross-origin
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return Response.json({ error: 'Invalid email or password' }, { status: 401, headers: CORS })
  }

  return Response.json({
    access_token: data.session.access_token,
    expires_at: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email
    }
  }, { status: 200, headers: CORS })
}
