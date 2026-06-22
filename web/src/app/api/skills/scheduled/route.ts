/**
 * GET /api/skills/scheduled
 * Returns all skills with schedule_enabled = true for the current user.
 * Called by the Electron main process on startup and every 5 minutes.
 */

import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient } from '@/lib/supabase'

export async function GET(request: Request) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('skills')
    .select('id, name, prompt, schedule_type, schedule_time, schedule_days, last_run_at')
    .eq('user_id', user.id)
    .eq('schedule_enabled', true)
    .order('name', { ascending: true })

  if (error) return jsonError(error.message, 500)
  return jsonOk(data)
}
