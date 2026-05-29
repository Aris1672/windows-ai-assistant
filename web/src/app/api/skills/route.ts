/**
 * GET  /api/skills        — list all skills for the current user
 * POST /api/skills        — create a new skill
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
    .select('*')
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
    name: string
    description?: string | null
    prompt: string
    context_app?: string | null
    context_folder?: string | null
    is_destructive?: boolean
    sort_order?: number
  }

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.name?.trim()) return jsonError('name is required', 400)
  if (!body.prompt?.trim()) return jsonError('prompt is required', 400)

  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('skills')
    .insert({
      user_id: user.id,
      name: body.name.trim(),
      description: body.description?.trim() ?? null,
      prompt: body.prompt.trim(),
      context_app: body.context_app ?? null,
      context_folder: body.context_folder ?? null,
      is_destructive: body.is_destructive ?? false,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return jsonError(error.message, 500)
  return jsonOk(data, 201)
}
