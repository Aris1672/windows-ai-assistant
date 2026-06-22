/**
 * PATCH  /api/skills/[id]   — update a skill (including schedule config)
 * DELETE /api/skills/[id]   — delete a skill
 */

import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Params) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  const { id } = await params

  let body: Partial<{
    name:             string
    description:      string | null
    prompt:           string
    context_app:      string | null
    context_folder:   string | null
    is_destructive:   boolean
    is_active:        boolean
    sort_order:       number
    // ── Schedule fields ───────────────────────────────────────────────────
    schedule_enabled: boolean
    schedule_type:    'daily' | 'weekdays' | 'custom' | null
    schedule_time:    string | null   // 'HH:MM'
    schedule_days:    number[] | null // [0..6], only used for 'custom'
  }>

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const update: Record<string, unknown> = {}

  // Core fields
  if (body.name           !== undefined) update.name           = body.name
  if (body.description    !== undefined) update.description    = body.description
  if (body.prompt         !== undefined) update.prompt         = body.prompt
  if (body.context_app    !== undefined) update.context_app    = body.context_app
  if (body.context_folder !== undefined) update.context_folder = body.context_folder
  if (body.is_destructive !== undefined) update.is_destructive = body.is_destructive
  if (body.is_active      !== undefined) update.is_active      = body.is_active
  if (body.sort_order     !== undefined) update.sort_order     = body.sort_order

  // Schedule fields
  if (body.schedule_enabled !== undefined) update.schedule_enabled = body.schedule_enabled
  if (body.schedule_type    !== undefined) update.schedule_type    = body.schedule_type
  if (body.schedule_time    !== undefined) update.schedule_time    = body.schedule_time
  if (body.schedule_days    !== undefined) update.schedule_days    = body.schedule_days

  // Clear schedule config when disabling
  if (body.schedule_enabled === false) {
    update.schedule_type = null
    update.schedule_time = null
    update.schedule_days = null
  }

  if (Object.keys(update).length === 0) return jsonError('No valid fields to update', 400)

  update.updated_at = new Date().toISOString()

  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('skills')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, description, prompt, context_app, context_folder, is_destructive, is_active, sort_order, schedule_enabled, schedule_type, schedule_time, schedule_days, last_run_at, created_at, updated_at')
    .single()

  if (error) return jsonError(error.message, 500)
  if (!data)  return jsonError('Skill not found', 404)
  return jsonOk(data)
}

export async function DELETE(request: Request, { params }: Params) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  const { id } = await params

  const supabase = createUserClient(accessToken)

  const { error, count } = await supabase
    .from('skills')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error)       return jsonError(error.message, 500)
  if (count === 0) return jsonError('Skill not found', 404)
  return jsonOk({ deleted: true })
}
