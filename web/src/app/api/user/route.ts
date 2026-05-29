/**
 * GET /api/user   — get the current user's profile
 * PUT /api/user   — update display_name or tier (admin only for tier)
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
    .from('users')
    .select('id, email, display_name, role, tier, created_at')
    .eq('id', user.id)
    .single()

  if (error) return jsonError('User not found', 404)
  return jsonOk(data)
}

export async function PUT(request: Request) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  let body: Partial<{
    display_name: string
    tier: string   // only admins can change tier
  }>

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  // Non-admins cannot change tier
  const update: Record<string, unknown> = {}
  if (body.display_name !== undefined) update.display_name = body.display_name
  if (body.tier !== undefined) {
    if (user.role !== 'admin') return jsonError('Forbidden', 403)
    update.tier = body.tier
  }

  if (Object.keys(update).length === 0) return jsonError('No valid fields to update', 400)

  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', user.id)
    .select('id, email, display_name, role, tier, created_at')
    .single()

  if (error) return jsonError(error.message, 500)
  return jsonOk(data)
}
