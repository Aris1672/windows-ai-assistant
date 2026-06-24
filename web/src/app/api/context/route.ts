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
import { routeQuery, SONNET, HAIKU } from '@/lib/router'
import { fetchTomorrowsEvents, formatEventsForPrompt } from '@/lib/ical-calendar'
import Anthropic from '@anthropic-ai/sdk'

const RATE_SONNET = 0.0000041  // $4.08 per 1M tokens
const RATE_HAIKU  = 0.00000025 // $0.25 per 1M tokens

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

/**
 * Result of the context source classifier.
 *   clipboard — use clipboard text as selected text, discard screenshot
 *   vision    — use screenshot, discard clipboard
 *   neither   — standalone query, use neither
 */
type ContextSource = 'clipboard' | 'vision' | 'neither'

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
    contextTray?:      { text: string; sourceApp: string; filePath?: string | null; addedAt: string }[]
    clipboardText?:    string | null
    fileRefs?:         { filePath: string; fileName: string; content: string; truncated: boolean }[]
  }

  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.message?.trim()) {
    return jsonError('message is required', 400)
  }

  // ── Step 1: fast parallel checks ─────────────────────────────────────────
  // Run context source classification and model routing in parallel — both are
  // lightweight Haiku calls (~200 ms). Neither depends on the other.
  //
  // Context source: given the query, the clipboard, and the fact that a
  // screenshot of the user's current screen is always available, Haiku decides:
  //   clipboard → use clipboard text as selectedText, discard screenshot
  //   vision    → use screenshot, discard clipboard
  //   neither   → standalone query, use neither
  //
  // If clipboard is empty the classifier is skipped entirely — vision fires
  // when a screenshot exists, neither otherwise.
  const hasFiles      = (body.fileRefs?.length ?? 0) > 0
  const clipboardText = body.clipboardText?.trim() ?? null
  const hasScreenshot = !!body.screenshotBase64

  let contextSource: ContextSource
  let model: string
  let calendarQuery: boolean

  try {
    ;[contextSource, model, calendarQuery] = await Promise.all([
      clipboardText
        ? resolveContextSource(clipboardText, body.message, hasScreenshot)
        : Promise.resolve(hasScreenshot ? 'vision' : 'neither' as ContextSource),
      routeQuery(
        body.message,
        hasFiles,
        hasScreenshot,           // tell the router a screenshot exists, unconditionally
        clipboardText?.length ?? 0,
      ),
      isCalendarQuery(body.message),
    ])
  } catch (err) {
    console.error('Routing/relevance error:', err)
    return jsonError('Failed to route request', 500)
  }

  // ── Step 2: resolve effective context ─────────────────────────────────────
  const effectiveSelectedText = contextSource === 'clipboard' ? clipboardText : null
  const effectiveScreenshot   = contextSource === 'vision'    ? (body.screenshotBase64 ?? null) : null

  // If this looks like a calendar query, fetch events now (parallel with context assembly below)
  const calendarEventsPromise = calendarQuery
    ? fetchTomorrowsEvents(user.id)
    : Promise.resolve(null)

  console.log(`[context] source=${contextSource} vision=${!!effectiveScreenshot} calendar=${calendarQuery}`)

  // ── Step 3: assemble context with resolved values ──────────────────────────
  let assembled: Awaited<ReturnType<typeof assembleContext>>

  try {
    assembled = await assembleContext(
      user.id,
      {
        activeApp:    body.activeApp    ?? null,
        activeFolder: body.activeFolder ?? null,
        selectedText: effectiveSelectedText,
        contextTray:  (body.contextTray ?? []).map(c => ({ ...c, filePath: c.filePath ?? null })),
        fileRefs:     body.fileRefs ?? [],
      },
      accessToken
    )
  } catch (err) {
    console.error('assembleContext error:', err)
    return jsonError('Failed to assemble context', 500)
  }

  // ── Inject calendar events into system prompt (if fetched) ────────────────
  const calendarResult = await calendarEventsPromise
  if (calendarResult !== null) {
    assembled.systemPrompt += '\n\n' + formatEventsForPrompt(calendarResult)
    console.log(`[context] injected ${calendarResult.events.length} calendar event(s) (tz=${calendarResult.timezone})`)
  }

  // ── Resolve user message ──────────────────────────────────────────────────
  // If a specific skill was invoked by ID, substitute its prompt.
  let userMessage = body.message
  if (body.skillId) {
    const skill = assembled.matchingSkills.find((s) => s.id === body.skillId)
    if (skill) {
      userMessage = skill.prompt.replace('{{selected_text}}', effectiveSelectedText ?? '')
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
    effectiveScreenshot
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

      // Tell the frontend which model was selected (resolved before stream started)
      send({ type: 'model', model })

      try {
        const messages: Anthropic.MessageParam[] = [
          ...(body.history ?? []).map((h) => ({
            role: h.role,
            content: h.content,
          })),
          { role: 'user' as const, content: currentContent },
        ]

        const claudeStream = await anthropic.messages.stream({
          model,
          max_tokens: 64000,
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
        const rateUsd = model === SONNET ? RATE_SONNET : RATE_HAIKU
        const costUsd       = totalTokens * rateUsd

        console.log('Stop reason:', finalMessage.stop_reason)
        console.log('Input tokens:', inputTokens)
        console.log('Output tokens:', outputTokens)

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
            model,
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
 * Asks Haiku to semantically decide what context source the query refers to.
 *
 * Returns:
 *   'clipboard' — the user wants to work with the clipboard text
 *   'vision'    — the user is referring to something on screen / visual
 *   'neither'   — standalone query, ignore both
 *
 * Only called when clipboard is non-empty. Runs in parallel with routeQuery
 * — same ~200ms latency budget. Falls back to 'vision' on any error so the
 * screenshot fires as the safe default.
 */
async function resolveContextSource(
  clipboardText: string,
  message: string,
  hasScreenshot: boolean,
): Promise<ContextSource> {
  try {
    const res = await anthropic.messages.create({
      model:      HAIKU,
      max_tokens: 10,
      system: `You are a context source classifier for a Windows AI assistant.
On every query the assistant has two possible sources of context:
1. Clipboard text — text the user previously copied.
2. Screen — a live screenshot of whatever is currently on the user's monitor.

Decide which source the user's query is about, or neither.
Reply ONLY with one word: "clipboard", "vision", or "neither". No other text.`,
      messages: [{
        role:    'user',
        content: `User query: "${message.slice(0, 200)}"

Clipboard content: "${clipboardText.slice(0, 400)}"

Screen screenshot available: ${hasScreenshot ? 'yes' : 'no'}

Which source does the user's query refer to?`,
      }],
    })

    const answer = (res.content.find(b => b.type === 'text')?.text ?? '')
      .trim().toLowerCase()

    let source: ContextSource
    if (answer.startsWith('clipboard')) source = 'clipboard'
    else if (answer.startsWith('vision'))    source = 'vision'
    else                                     source = 'neither'

    console.log(`[context-source] "${message.slice(0, 40)}" → ${source}`)
    return source
  } catch (err) {
    console.warn('[context-source] classifier failed, defaulting to vision:', err)
    return 'vision'  // safe default — screenshot fires
  }
}

/**
 * Asks Haiku whether the query is calendar-related.
 * Runs in parallel with the other checks — same ~200ms budget.
 * Falls back to false on any error so we don't accidentally fetch calendar data.
 */
async function isCalendarQuery(message: string): Promise<boolean> {
  try {
    const res = await anthropic.messages.create({
      model:      HAIKU,
      max_tokens: 10,
      system:     'You are a classifier. Reply ONLY with "yes" or "no". No other text.',
      messages:   [{
        role:    'user',
        content: `Is this query asking about the user's calendar, schedule, meetings, appointments, or what they have planned for a specific day or time?\n\nQuery: "${message.slice(0, 300)}"`,
      }],
    })
    const answer = res.content.find(b => b.type === 'text')?.text?.trim().toLowerCase() ?? 'no'
    const result = answer.startsWith('yes')
    console.log(`[calendar] "${message.slice(0, 40)}" → ${result ? 'calendar query' : 'not calendar'}`)
    return result
  } catch (err) {
    console.warn('[calendar] classifier failed, skipping calendar fetch:', err)
    return false
  }
}

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
