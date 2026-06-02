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
 *
 * Traffic path: browser → Vercel → Supabase  ✓
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
