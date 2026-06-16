/**
 * router.ts — Semantic model router
 *
 * Uses Claude Haiku as a fast, language-agnostic intent classifier to decide
 * whether a request needs Sonnet (complex / app-control / compose) or Haiku
 * (simple / transform / lookup).
 *
 * Why not regex?
 *   Regex is English-only and misses paraphrases. A human can say "compose",
 *   "write", "create", "draft", "send", "написать письмо", "сочини письмо" —
 *   all meaning the same thing. The classifier understands all of them.
 *
 * Cost: ~50 input + 20 output tokens per call ≈ $0.000004 at Haiku pricing.
 * Latency: ~200–300 ms — runs in parallel with assembleContext, zero overhead.
 */

import Anthropic from '@anthropic-ai/sdk'

export const SONNET = 'claude-sonnet-4-6'
export const HAIKU  = 'claude-haiku-4-5-20251001'

// ─── Classifier prompt ────────────────────────────────────────────────────────
//
// Keep this prompt tight. The model only needs to output a tiny JSON object.
// We do NOT list explicit keywords — the model uses semantic understanding,
// which works in any language the user writes in.
//
const ROUTER_SYSTEM = `You are a task classifier for a Windows AI assistant.
Classify the user's request into ONE category and return ONLY valid JSON — no other text, no markdown.

Categories:
- "app_control"  → opening, launching, switching to, or controlling any application or program
- "compose"      → writing emails, letters, documents, or any substantial text from scratch
- "code"         → writing, reviewing, debugging, or explaining code
- "analysis"     → contracts, legal review, complex comparison, restructuring documents
- "transform"    → rewriting, translating, fixing, or summarising short selected text
- "lookup"       → quick facts, short answers, simple questions
- "other"        → anything else

Model assignment:
- "sonnet" → app_control, compose, code, analysis
- "haiku"  → transform, lookup, other

Respond ONLY with: {"category": "...", "model": "sonnet" | "haiku"}`

// ─── Anthropic client ─────────────────────────────────────────────────────────
//
// Reuse the same SDK instance as route.ts — but since this module is imported
// there, we create our own instance here (both read from the same env var).
//
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns the model string to use for a given query.
 *
 * Hard signal overrides (no classifier call needed):
 *   - Files attached       → always Sonnet (strong comprehension required)
 *   - Screenshot present   → always Sonnet (Vision tasks)
 *   - Selected text > 4000 chars → always Sonnet (~1000 tokens of context)
 *
 * Everything else → Haiku classifier decides.
 * Falls back to Sonnet on any error (safe default).
 */
export async function routeQuery(
  message: string,
  hasFiles: boolean,
  hasScreenshot: boolean,
  selectedTextLength: number,
): Promise<string> {
  // ── Hard overrides ────────────────────────────────────────────────────────
  if (hasFiles)                  return SONNET
  if (hasScreenshot)             return SONNET
  if (selectedTextLength > 4000) return SONNET

  // ── Semantic classification ───────────────────────────────────────────────
  try {
    const res = await anthropic.messages.create({
      model:      HAIKU,
      max_tokens: 60,
      system:     ROUTER_SYSTEM,
      messages:   [{ role: 'user', content: message }],
    })

    const raw    = res.content.find((b) => b.type === 'text')?.text ?? ''
    const parsed = JSON.parse(raw) as { category: string; model: 'sonnet' | 'haiku' }

    console.log(`[router] "${message.slice(0, 60)}…" → ${parsed.category} → ${parsed.model}`)

    return parsed.model === 'sonnet' ? SONNET : HAIKU
  } catch (err) {
    // Classification failed (parse error, network blip, etc.) — safe default
    console.warn('[router] Classification failed, defaulting to Sonnet:', err)
    return SONNET
  }
}
