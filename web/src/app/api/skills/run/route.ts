/**
 * POST /api/skills/run
 * Executes a skill and returns the full text result (non-streaming).
 * Called by the Electron scheduler when a scheduled skill fires.
 *
 * Body: { skillId: string, clips?: { text: string; sourceApp: string | null }[] }
 */

import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MODEL = 'claude-sonnet-4-6'

interface Clip {
  text:      string
  sourceApp: string | null
}

export async function POST(request: Request) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  let body: { skillId: string; clips?: Clip[] }
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.skillId) return jsonError('skillId is required', 400)

  const supabase = createUserClient(accessToken)

  // ── Fetch the skill ────────────────────────────────────────────────────────
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .select('id, name, prompt, schedule_enabled')
    .eq('id', body.skillId)
    .eq('user_id', user.id)
    .single()

  if (skillError || !skill) return jsonError('Skill not found', 404)
  if (!skill.schedule_enabled) return jsonError('Skill is not scheduled', 400)

  // ── Assemble prompt ────────────────────────────────────────────────────────
  let userMessage = skill.prompt

  const clips = body.clips ?? []
  if (clips.length > 0) {
    const clipsText = clips
      .map((c) => `[${c.sourceApp ?? 'Clip'}]\n${c.text}`)
      .join('\n\n---\n\n')
    userMessage = `${skill.prompt}\n\n<context>\n${clipsText}\n</context>`
  }

  // ── Call Anthropic (non-streaming) ─────────────────────────────────────────
  const started = Date.now()
  let result: string
  let inputTokens = 0
  let outputTokens = 0

  try {
    const message = await anthropic.messages.create({
      model:      MODEL,
      max_tokens: 1024,
      messages:   [{ role: 'user', content: userMessage }],
    })

    result       = message.content.filter(b => b.type === 'text').map(b => b.text).join('')
    inputTokens  = message.usage.input_tokens
    outputTokens = message.usage.output_tokens
  } catch (err) {
    console.error('[skills/run] Anthropic error:', err)
    return jsonError('AI request failed', 502)
  }

  // ── Log to actions ─────────────────────────────────────────────────────────
  const { data: action } = await supabase
    .from('actions')
    .insert({
      user_id:      user.id,
      skill_id:     skill.id,
      action_type:  'scheduled_skill',
      action_label: skill.name,
      context_text: clips.length > 0 ? clips.map(c => c.text).join('\n') : null,
      status:       'completed',
    })
    .select('id')
    .single()

  // ── Log token usage ────────────────────────────────────────────────────────
  const totalTokens = inputTokens + outputTokens
  const costUsd     = (inputTokens * 0.000003) + (outputTokens * 0.000015)

  await supabase.from('token_usage').insert({
    user_id:       user.id,
    action_id:     action?.id ?? null,
    input_tokens:  inputTokens,
    output_tokens: outputTokens,
    total_tokens:  totalTokens,
    cost_usd:      costUsd,
    action_type:   'scheduled_skill',
    model:         MODEL,
  })

  // ── Update last_run_at on the skill ───────────────────────────────────────
  await supabase
    .from('skills')
    .update({ last_run_at: new Date().toISOString() })
    .eq('id', skill.id)

  console.log(`[skills/run] "${skill.name}" completed in ${Date.now() - started}ms — ${totalTokens} tokens`)

  return jsonOk({ result })
}
