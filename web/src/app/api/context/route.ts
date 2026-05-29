/**
 * POST /api/context
 *
 * The brain of the system. Called by the Electron app on every Ctrl+Space.
 *
 * Request body:
 * {
 *   activeApp:    string | null   // e.g. "Microsoft Excel"
 *   activeFolder: string | null   // e.g. "C:/Work/Invoices"
 *   selectedText: string | null   // highlighted text
 *   message:      string          // what the user typed or the skill name
 *   skillId:      string | null   // if a specific skill was triggered
 *   history:      { role: "user" | "assistant", content: string }[]  // conversation so far
 * }
 *
 * Response:
 * - Streaming text/event-stream (SSE) with Claude's response
 * - On the first event: sends { type: "skills", skills: [...] }
 * - Subsequent events: { type: "delta", text: "..." }
 * - Final event: { type: "done" }
 */

import { requireAuth, jsonError } from '@/lib/auth'
import { assembleContext } from '@/lib/assembler'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'edge'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: {
    activeApp?: string | null
    activeFolder?: string | null
    selectedText?: string | null
    message: string
    skillId?: string | null
    history?: { role: 'user' | 'assistant'; content: string }[]
  }

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.message?.trim()) {
    return jsonError('message is required', 400)
  }

  // ── Assemble context ────────────────────────────────────────────────────────
  let assembled
  try {
    assembled = await assembleContext(
      user.id,
      {
        activeApp: body.activeApp ?? null,
        activeFolder: body.activeFolder ?? null,
        selectedText: body.selectedText ?? null,
      },
      accessToken
    )
  } catch (err) {
    console.error('assembleContext error:', err)
    return jsonError('Failed to assemble context', 500)
  }

  // ── Build the user message ──────────────────────────────────────────────────
  // If a specific skill was invoked, inject its prompt
  let userMessage = body.message
  if (body.skillId) {
    const skill = assembled.matchingSkills.find((s) => s.id === body.skillId)
    if (skill) {
      userMessage = skill.prompt.replace('{{selected_text}}', body.selectedText ?? '')
    }
  }

  // ── Stream response ─────────────────────────────────────────────────────────
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // First event: send matching skills to populate the palette
      send({ type: 'skills', skills: assembled.matchingSkills })

      try {
        const messages = [
          ...(body.history ?? []),
          { role: 'user' as const, content: userMessage },
        ]

        const claudeStream = await anthropic.messages.stream({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: assembled.systemPrompt,
          messages,
        })

        for await (const event of claudeStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            send({ type: 'delta', text: event.delta.text })
          }
        }

        send({ type: 'done' })
      } catch (err) {
        console.error('Claude stream error:', err)
        send({ type: 'error', message: 'AI response failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
