import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jsonError, jsonOk } from '@/lib/auth'

// Use the anon key here — signInWithPassword is a public operation.
// The returned access_token is a signed JWT the Electron app stores locally
// and sends as "Authorization: Bearer <token>" on every subsequent request.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  let email: string, password: string

  try {
    const body = await req.json()
    email = body.email
    password = body.password
  } catch {
    return jsonError('Invalid request body', 400)
  }

  if (!email || !password) {
    return jsonError('email and password are required', 400)
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    // Return a generic message — don't reveal whether the email exists
    return jsonError('Invalid email or password', 401)
  }

  return jsonOk({
    access_token: data.session.access_token,
    expires_at: data.session.expires_at,
    user: {
      id: data.user.id,
      email: data.user.email
    }
  })
}
