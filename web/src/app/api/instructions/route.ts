/**
 * GET  /api/instructions   — list all instructions for the current user
 * POST /api/instructions   — create a new instruction
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
    .from('instructions')
    .select('id, label, instruction_text, context_app, context_folder, is_active, sort_order, created_at, updated_at')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  if (error) return jsonError(error.message, 500)
  return jsonOk(data)
}

export async function POST(request: Request) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  let body: {
    label: string
    instruction_text: string
    context_app?: string | null
    context_folder?: string | null
    is_active?: boolean
    sort_order?: number
  }

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.label?.trim())            return jsonError('label is required', 400)
  if (!body.instruction_text?.trim()) return jsonError('instruction_text is required', 400)

  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('instructions')
    .insert({
      user_id:          user.id,
      label:            body.label.trim(),
      instruction_text: body.instruction_text.trim(),
      context_app:      body.context_app    ?? null,
      context_folder:   body.context_folder ?? null,
      is_active:        body.is_active      ?? true,
      sort_order:       body.sort_order     ?? 0,
    })
    .select('id, label, instruction_text, context_app, context_folder, is_active, sort_order, created_at, updated_at')
    .single()

  if (error) return jsonError(error.message, 500)
  return jsonOk(data, 201)
}
