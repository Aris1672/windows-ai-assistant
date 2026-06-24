import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req)
  if (authResult instanceof NextResponse) return authResult
  const { user, accessToken } = authResult
  const userId = user.id

  const supabase = createUserClient(accessToken)

  // Fetch last 50 actions — we want app_context, query, action_type, created_at
  const { data: actions, error } = await supabase
    .from('actions')
    .select('app_context, query, action_type, status, created_at')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return jsonError('Failed to fetch actions', 500)
  if (!actions || actions.length < 5) {
    // Not enough history to detect a pattern yet
    return jsonOk({ pattern: null })
  }

  // Format actions as a compact list for the prompt
  const actionList = actions
    .map((a, i) => {
      const date = new Date(a.created_at).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      })
      return `${i + 1}. [${date}] App: ${a.app_context || 'Unknown'} | Type: ${a.action_type || 'query'} | Query: "${(a.query || '').slice(0, 80)}"`
    })
    .join('\n')

  const prompt = `You are analysing a user's recent AI assistant usage history to detect repeating multi-step workflows that could be automated as a saved "Skill".

Here are the user's last ${actions.length} completed actions (newest first):

${actionList}

Instructions:
- Look for sequences of 2+ actions that repeat across different days (same apps, same intent, same kind of task).
- Only return a pattern if you are genuinely confident (≥ 0.75) it is a real recurring workflow — not a coincidence.
- A good pattern example: user repeatedly opens Excel, copies data, then writes an email summary.
- Do NOT suggest a pattern for one-off actions, random queries, or things that only happened once.
- If no clear pattern exists, return null for the pattern field.

Respond ONLY with a valid JSON object in this exact shape (no markdown, no backticks):
{
  "pattern": {
    "name": "Short skill name (3-5 words)",
    "description": "One sentence describing what the user repeatedly does",
    "suggested_prompt": "A ready-to-use skill prompt (2-4 sentences) that would automate this workflow",
    "apps_involved": ["App1", "App2"],
    "confidence": 0.85
  } | null
}`

  let raw = ''
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })
    raw = (response.content[0] as { type: string; text: string }).text.trim()

    // Strip any accidental markdown fences
    raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

    const parsed = JSON.parse(raw)

    // Enforce minimum confidence threshold
    if (parsed.pattern && parsed.pattern.confidence < 0.75) {
      return jsonOk({ pattern: null })
    }

    return jsonOk({ pattern: parsed.pattern ?? null })
  } catch (err) {
    console.error('[patterns] parse error:', err, 'raw:', raw)
    return jsonOk({ pattern: null }) // Safe fallback — never break the palette
  }
}
