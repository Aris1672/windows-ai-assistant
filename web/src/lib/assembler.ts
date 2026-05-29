/**
 * assembleContext
 *
 * Given a user's active context (app, folder, selected text) this function:
 * 1. Fetches all active instructions for the user
 * 2. Filters to those that match the current context
 * 3. Fetches all active skills for the user
 * 4. Filters to those that should surface in the current context
 * 5. Builds a single merged system prompt to send to Claude
 * 6. Returns the matching skills list for the palette UI
 */

import { createUserClient } from './supabase'

export interface ContextBundle {
  activeApp: string | null
  activeFolder: string | null
  selectedText: string | null
}

export interface Skill {
  id: string
  name: string
  description: string | null
  prompt: string
  isDestructive: boolean
}

export interface AssembledContext {
  systemPrompt: string
  matchingSkills: Skill[]
}

export async function assembleContext(
  userId: string,
  bundle: ContextBundle,
  accessToken: string
): Promise<AssembledContext> {
  const supabase = createUserClient(accessToken)

  // ── Fetch all active instructions ──────────────────────────────────────────
  const { data: instructions, error: iErr } = await supabase
    .from('instructions')
    .select('label, instruction_text, context_app, context_folder')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (iErr) throw new Error(`Failed to fetch instructions: ${iErr.message}`)

  // ── Filter instructions to those matching the current context ──────────────
  const activeInstructions = (instructions ?? []).filter((inst) => {
    if (inst.context_app && inst.context_app !== bundle.activeApp) return false
    if (inst.context_folder && !bundle.activeFolder?.startsWith(inst.context_folder)) return false
    return true
  })

  // ── Fetch all active skills ─────────────────────────────────────────────────
  const { data: skills, error: sErr } = await supabase
    .from('skills')
    .select('id, name, description, prompt, context_app, context_folder, is_destructive')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (sErr) throw new Error(`Failed to fetch skills: ${sErr.message}`)

  // ── Filter skills to those matching the current context ────────────────────
  const matchingSkills: Skill[] = (skills ?? [])
    .filter((skill) => {
      if (skill.context_app && skill.context_app !== bundle.activeApp) return false
      if (skill.context_folder && !bundle.activeFolder?.startsWith(skill.context_folder)) return false
      return true
    })
    .map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      prompt: skill.prompt,
      isDestructive: skill.is_destructive,
    }))

  // ── Assemble the system prompt ─────────────────────────────────────────────
  const parts: string[] = []

  parts.push(`You are a fast, focused Windows AI assistant embedded in a command palette.
You help users with whatever they are working on right now.
You are not a chatbot — you are a co-worker. Be direct, concise, and useful.
Always respond in the same language the user writes in.`)

  // Context block
  if (bundle.activeApp || bundle.activeFolder || bundle.selectedText) {
    parts.push(`\n## Current Context`)
    if (bundle.activeApp) parts.push(`Active application: ${bundle.activeApp}`)
    if (bundle.activeFolder) parts.push(`Active folder: ${bundle.activeFolder}`)
    if (bundle.selectedText) parts.push(`Selected text:\n"""\n${bundle.selectedText}\n"""`)
  }

  // User instructions block
  if (activeInstructions.length > 0) {
    parts.push(`\n## User Instructions\nAlways follow these rules:`)
    activeInstructions.forEach((inst) => {
      parts.push(`- ${inst.instruction_text}`)
    })
  }

  // Available skills block (for Claude's awareness)
  if (matchingSkills.length > 0) {
    parts.push(`\n## Available Skills\nThe user may invoke one of these named skills:`)
    matchingSkills.forEach((skill) => {
      parts.push(`- **${skill.name}**: ${skill.description ?? skill.prompt}`)
    })
  }

  parts.push(`\nIf the user invokes a skill by name, execute it using the selected text and current context.
For read-only actions, respond immediately. For write or destructive actions, always confirm before executing.`)

  return {
    systemPrompt: parts.join('\n'),
    matchingSkills,
  }
}
