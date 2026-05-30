/**
 * GET    /api/instructions/[id]  — get a single instruction
 * PUT    /api/instructions/[id]  — update an instruction
 * DELETE /api/instructions/[id]  — delete an instruction
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
    .from('instructions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) return jsonError('Instruction not found', 404)
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
    label: string
    instruction_text: string
    context_app: string | null
    context_folder: string | null
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
    .from('instructions')
    .update(body)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return jsonError(error.message, 500)
  if (!data) return jsonError('Instruction not found', 404)
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
    .from('instructions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return jsonError(error.message, 500)
  return jsonOk({ deleted: true })
}
