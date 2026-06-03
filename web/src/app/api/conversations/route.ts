import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient } from '@/lib/supabase'

/**
 * POST /api/conversations
 *
 * Creates a new conversation record tied to the user's current context.
 * Called by the Electron renderer on every first submit in a palette session.
 * Fire-and-forget from the client — happens in parallel with the stream.
 *
 * Body:
 * {
 *   title:          string          // first ~80 chars of the user's query
 *   context_app:    string | null
 *   context_folder: string | null
 *   context_text:   string | null   // selected text at open time
 * }
 *
 * Response: the created row (201)
 *
 * Traffic path: Electron → Vercel → Supabase  ✓
 */
export async function POST(request: Request) {
  let authResult: Awaited<ReturnType<typeof requireAuth>>
  try {
    authResult = await requireAuth(request)
  } catch (e) {
    return e as Response
  }

  const { user, accessToken } = authResult

  let body: {
    title?:          string | null
    context_app?:    string | null
    context_folder?: string | null
    context_text?:   string | null
  }

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id:        user.id,
      title:          body.title?.slice(0, 200) ?? null,
      context_app:    body.context_app    ?? null,
      context_folder: body.context_folder ?? null,
      context_text:   body.context_text   ?? null,
    })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  return jsonOk(data, 201)
}
