import { NextRequest } from 'next/server'
import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient } from '@/lib/supabase'

/**
 * POST /api/conversations/[id]/messages
 *
 * Batch-inserts messages for a conversation.
 * Called by the renderer after the assistant response completes — fire-and-forget.
 *
 * Body:
 * {
 *   messages: { role: 'user' | 'assistant'; content: string }[]
 * }
 *
 * Response: { ok: true, count: number }
 *
 * Traffic path: Electron → Vercel → Supabase  ✓
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let authResult: Awaited<ReturnType<typeof requireAuth>>
  try {
    authResult = await requireAuth(request)
  } catch (e) {
    return e as Response
  }

  const { user, accessToken } = authResult
  const { id: conversationId } = await params

  let body: {
    messages?: { role: string; content: string }[]
  }

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonError('messages array is required', 400)
  }

  const supabase = createUserClient(accessToken)

  // Verify the conversation belongs to this user before inserting
  const { data: convo, error: convoErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (convoErr || !convo) {
    return jsonError('Conversation not found', 404)
  }

  const rows = body.messages.map((msg) => ({
    conversation_id: conversationId,
    user_id:         user.id,
    role:            msg.role,
    content:         msg.content,
  }))

  const { error } = await supabase.from('messages').insert(rows)
  if (error) return jsonError(error.message, 500)

  // Update conversation's updated_at
  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  return jsonOk({ ok: true, count: rows.length })
}
