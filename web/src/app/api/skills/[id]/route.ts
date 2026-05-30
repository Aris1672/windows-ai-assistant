/**
 * GET    /api/skills/[id]  — get a single skill
 * PUT    /api/skills/[id]  — update a skill
 * DELETE /api/skills/[id]  — delete a skill
 */

import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient } from '@/lib/supabase'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Params) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  const { id } = await params
  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return jsonError('Skill not found', 404)
  return jsonOk(data)
}

export async function PUT(request: Request, { params }: Params) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  let body: Partial<{
    name: string
    description: string | null
    prompt: string
    context_app: string | null
    context_folder: string | null
    is_destructive: boolean
    is_active: boolean
    sort_order: number
  }>

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const { id } = await params
  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('skills')
    .update(body)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return jsonError(error.message, 500)
  if (!data) return jsonError('Skill not found', 404)
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

  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return jsonError(error.message, 500)
  return jsonOk({ deleted: true })
}
