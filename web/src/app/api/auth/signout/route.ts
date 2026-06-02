import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/signout
 *
 * Signs the user out server-side and clears the Supabase session cookies.
 * Called by Sidebar.tsx instead of supabase.auth.signOut() from the browser.
 *
 * Traffic path: browser → Vercel → Supabase  ✓
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Supabase will call setAll with empty/expired cookies to clear the session
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  await supabase.auth.signOut()

  return response
}
