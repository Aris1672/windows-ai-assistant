import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient } from '@/lib/supabase'

/**
 * GET /api/actions
 *
 * Returns paginated action history for the authenticated user.
 *
 * Query params:
 *   status  — 'all' | 'done' | 'error' | 'pending'  (default: 'all')
 *   search  — ilike filter on action_label            (default: '')
 *   offset  — pagination offset                       (default: 0)
 *
 * Response: { data: Action[], count: number }
 */

const PAGE_SIZE = 25

export async function GET(request: Request) {
  let authResult: Awaited<ReturnType<typeof requireAuth>>
  try {
    authResult = await requireAuth(request)
  } catch (e) {
    return e as Response
  }

  const { user, accessToken } = authResult
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status') ?? 'all'
  const search = searchParams.get('search') ?? ''
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const supabase = createUserClient(accessToken)

  let query = supabase
    .from('actions')
    .select('id, action_label, context_app, status, created_at', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (status !== 'all') query = query.eq('status', status)
  if (search.trim())    query = query.ilike('action_label', `%${search.trim()}%`)

  const { data, count, error } = await query
  if (error) return jsonError(error.message, 500)

  return jsonOk({ data: data ?? [], count: count ?? 0 })
}

/**
 * POST /api/actions
 *
 * Records a completed action in the user's history.
 * Called by the Electron main process after every action execution.
 * Fire-and-forget from the client — failure here never affects UX.
 *
 * Body (matched to actual schema):
 * {
 *   action_type:     string          // raw type, e.g. "insert_text"
 *   action_label:    string          // human label, e.g. "Insert text"
 *   context_app:     string | null
 *   context_folder:  string | null
 *   status:          'done' | 'error'
 *   conversation_id: string | null   // links action to its palette session
 *   skill_id:        string | null   // set if action was triggered via a skill
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
    action_type?:     string
    action_label?:    string
    context_app?:     string | null
    context_folder?:  string | null
    status?:          string
    conversation_id?: string | null
    skill_id?:        string | null
  }

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.action_label?.trim()) return jsonError('action_label is required', 400)
  if (!body.status?.trim())       return jsonError('status is required', 400)

  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('actions')
    .insert({
      user_id:         user.id,
      action_type:     body.action_type     ?? null,
      action_label:    body.action_label.trim(),
      context_app:     body.context_app     ?? null,
      context_folder:  body.context_folder  ?? null,
      status:          body.status.trim(),
      conversation_id: body.conversation_id ?? null,
      skill_id:        body.skill_id        ?? null,
    })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)

  return jsonOk(data, 201)
}
