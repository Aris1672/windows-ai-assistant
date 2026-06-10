/**
 * POST /api/context
 *
 * The brain of the system. Called by the Electron app on every Ctrl+Space.
 *
 * Request body:
 * {
 *   activeApp:        string | null
 *   activeFolder:     string | null
 *   selectedText:     string | null
 *   screenshotBase64: string | null   // base64 PNG — enables Claude Vision
 *   message:          string
 *   skillId:          string | null
 *   history:          { role: "user" | "assistant", content: string }[]
 * }
 *
 * Response: text/event-stream (SSE)
 *   { type: "skills",  skills: [...] }   — first event
 *   { type: "delta",   text: "..." }     — streamed tokens
 *   { type: "done" }                     — final event
 *   { type: "error",   message: "..." }  — on failure
 */

import { requireAuth, jsonError } from '@/lib/auth'
import { assembleContext } from '@/lib/assembler'
import { createUserClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const TOKEN_RATE_USD = 0.0000041 // $4.08 per 1M tokens (Claude Sonnet)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ─── Types ────────────────────────────────────────────────────────────────────

type TextBlock  = { type: 'text';  text: string }
type ImageBlock = {
  type: 'image'
  source: { type: 'base64'; media_type: 'image/png'; data: string }
}
type ContentBlock = TextBlock | ImageBlock

export async function POST(request: Request) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  let user: Awaited<ReturnType<typeof requireAuth>>['user']
  let accessToken: string

  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    activeApp?:        string | null
    activeFolder?:     string | null
    selectedText?:     string | null
    screenshotBase64?: string | null
    message:           string
    skillId?:          string | null
    history?:          { role: 'user' | 'assistant'; content: string }[]
    contextTray?:      { text: string; sourceApp: string; filePath?: string | null; addedAt: number }[]
  }

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.message?.trim()) {
    return jsonError('message is required', 400)
  }

  // ── Assemble context ──────────────────────────────────────────────────────
  let assembled: Awaited<ReturnType<typeof assembleContext>>

  try {
    assembled = await assembleContext(
      user.id,
      {
        activeApp:    body.activeApp    ?? null,
        activeFolder: body.activeFolder ?? null,
        selectedText: body.selectedText ?? null,
        contextTray:  body.contextTray  ?? [],
      },
      accessToken
    )
  } catch (err) {
    console.error('assembleContext error:', err)
    return jsonError('Failed to assemble context', 500)
  }

  // ── Resolve user message ──────────────────────────────────────────────────
  // If a specific skill was invoked by ID, substitute its prompt.
  let userMessage = body.message
  if (body.skillId) {
    const skill = assembled.matchingSkills.find((s) => s.id === body.skillId)
    if (skill) {
      userMessage = skill.prompt.replace('{{selected_text}}', body.selectedText ?? '')
    }
  }

  // ── Build Claude message content ──────────────────────────────────────────
  // When a screenshot is present: send [image, text] so Claude can see the
  // screen. When absent: send a plain string to keep the payload small and
  // avoid any unnecessary vision processing cost.
  //
  // Only the CURRENT turn gets the screenshot — conversation history stays
  // as plain text, which is correct (the image is always "right now").
  const currentContent: string | ContentBlock[] = buildContent(
    userMessage,
    body.screenshotBase64 ?? null
  )

  // ── Stream response ───────────────────────────────────────────────────────
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      // First event: matching skills for the palette action menu
      send({ type: 'skills', skills: assembled.matchingSkills })

      try {
        const messages: Anthropic.MessageParam[] = [
          ...(body.history ?? []).map((h) => ({
            role: h.role,
            content: h.content,
          })),
          { role: 'user' as const, content: currentContent },
        ]

        const claudeStream = await anthropic.messages.stream({
          model:      'claude-sonnet-4-6',
          max_tokens: 1024,
          system:     assembled.systemPrompt,
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

        // ── Track token usage ───────────────────────────────────────────
        // finalMessage() is available after stream ends — no extra API call
        const finalMessage  = await claudeStream.finalMessage()
        const inputTokens   = finalMessage.usage.input_tokens
        const outputTokens  = finalMessage.usage.output_tokens
        const totalTokens   = inputTokens + outputTokens
        const costUsd       = totalTokens * TOKEN_RATE_USD

        try {
          const supabase = createUserClient(accessToken)

          // 1. Save to token_usage table (detailed analytics)
          await supabase.from('token_usage').insert({
            user_id:       user.id,
            input_tokens:  inputTokens,
            output_tokens: outputTokens,
            total_tokens:  totalTokens,
            cost_usd:      costUsd,
            action_type:   body.skillId ? 'skill' : 'query',
            model:         'claude-sonnet-4-6',
          })

          // 2. Update user totals in real-time
          await supabase.rpc('increment_user_tokens', {
            user_id:      user.id,
            tokens_count: totalTokens,
            cost:         costUsd,
          })
        } catch (tokenErr) {
          // Non-fatal — don't fail the response if tracking fails
          console.error('Token tracking error:', tokenErr)
        }
        // ── End token tracking ──────────────────────────────────────────

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
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds the content for the current user turn.
 *
 * With screenshot → [image block, text block]
 * Without         → plain string (cheaper, faster)
 */
function buildContent(
  text: string,
  screenshotBase64: string | null
): string | ContentBlock[] {
  if (!screenshotBase64) return text

  return [
    {
      type:   'image',
      source: {
        type:       'base64',
        media_type: 'image/png',
        data:       screenshotBase64,
      },
    },
    {
      type: 'text',
      text,
    },
  ]
}
