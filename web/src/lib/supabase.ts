import { createClient } from '@supabase/supabase-js'

// Server-side client — uses the service role key (bypasses RLS where needed)
// Only used in API routes, never exposed to the browser
export function createServiceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

// Server-side client that respects RLS — uses the user's JWT
export function createUserClient(accessToken: string) {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars')
  }

  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false },
  })
}
