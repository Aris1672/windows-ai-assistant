/**
 * assembleContext
 *
 * Given a user's active context (app, folder, selected text) this function:
 * 1. Fetches all active instructions for the user
 * 2. Filters to those that match the current context
 * 3. Fetches all active skills for the user
 * 4. Filters to those that should surface in the current context
 * 5. Fetches recent conversations for the same context (workflow memory)
 * 6. Builds a single merged system prompt to send to Claude
 * 7. Returns the matching skills list for the palette UI
 */

import { createUserClient } from './supabase'

// ─── Context Clip (mirrors Electron store type) ───────────────────────────────

export interface ContextClip {
  text:      string
  sourceApp: string | null
  filePath:  string | null
  addedAt:   string
}

export interface ContextBundle {
  activeApp:    string | null
  activeFolder: string | null
  selectedText: string | null
  contextTray?: ContextClip[]   // ← pinned clips from the tray
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

// ─── Recent activity types ────────────────────────────────────────────────────

interface RecentMessage {
  role: string
  content: string
  created_at: string
}

interface RecentConversation {
  id: string
  title: string | null
  created_at: string
  messages: RecentMessage[]
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function assembleContext(
  userId: string,
  bundle: ContextBundle,
  accessToken: string
): Promise<AssembledContext> {
  const supabase = createUserClient(accessToken)

  // ── Fetch all data in parallel ─────────────────────────────────────────────
  const [instructionsResult, skillsResult, recentConversations] = await Promise.all([
    supabase
      .from('instructions')
      .select('label, instruction_text, context_app, context_folder')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('skills')
      .select('id, name, description, prompt, context_app, context_folder, is_destructive')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    fetchRecentActivity(supabase, userId, bundle),
  ])

  if (instructionsResult.error) {
    throw new Error(`Failed to fetch instructions: ${instructionsResult.error.message}`)
  }
  if (skillsResult.error) {
    throw new Error(`Failed to fetch skills: ${skillsResult.error.message}`)
  }

  // ── Filter instructions to those matching the current context ──────────────
  const activeInstructions = (instructionsResult.data ?? []).filter((inst) => {
    if (inst.context_app    && inst.context_app    !== bundle.activeApp)                   return false
    if (inst.context_folder && !bundle.activeFolder?.startsWith(inst.context_folder))      return false
    return true
  })

  // ── Filter skills to those matching the current context ────────────────────
  const matchingSkills: Skill[] = (skillsResult.data ?? [])
    .filter((skill) => {
      if (skill.context_app    && skill.context_app    !== bundle.activeApp)               return false
      if (skill.context_folder && !bundle.activeFolder?.startsWith(skill.context_folder))  return false
      return true
    })
    .map((skill) => ({
      id:            skill.id,
      name:          skill.name,
      description:   skill.description,
      prompt:        skill.prompt,
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
    if (bundle.activeApp)    parts.push(`Active application: ${bundle.activeApp}`)
    if (bundle.activeFolder) parts.push(`Active folder: ${bundle.activeFolder}`)
    if (bundle.selectedText) parts.push(`Selected text:\n"""\n${bundle.selectedText}\n"""`)
  }

  // ── Context Tray block ─────────────────────────────────────────────────────
  // Clips the user explicitly pinned across different apps/documents.
  // Each clip is labelled with its source so Claude can reason about provenance.
  const trayClips = bundle.contextTray ?? []
  if (trayClips.length > 0) {
    parts.push(`\n## Pinned Context (${trayClips.length} clip${trayClips.length > 1 ? 's' : ''})`)
    parts.push(`The user has pinned the following content from other documents or apps. Use it alongside the current context to answer their question.`)
    trayClips.forEach((clip, i) => {
      const label = [
        clip.sourceApp ?? 'Unknown app',
        clip.filePath  ? `— ${clip.filePath.split(/[/\\]/).pop()}` : '',
      ].filter(Boolean).join(' ')
      parts.push(`\n### Clip ${i + 1} — ${label}\n"""\n${clip.text}\n"""`)
    })
  }

  // User instructions block
  if (activeInstructions.length > 0) {
    parts.push(`\n## User Instructions\nAlways follow these rules:`)
    activeInstructions.forEach((inst) => {
      parts.push(`- ${inst.instruction_text}`)
    })
  }

  // Available skills block
  if (matchingSkills.length > 0) {
    parts.push(`\n## Available Skills\nThe user may invoke one of these named skills:`)
    matchingSkills.forEach((skill) => {
      parts.push(`- **${skill.name}**: ${skill.description ?? skill.prompt}`)
    })
  }

  parts.push(`\nIf the user invokes a skill by name, execute it using the selected text and current context.`)

  // ── Workflow memory block ──────────────────────────────────────────────────
  if (recentConversations.length > 0) {
    parts.push(`\n## Recent Activity`)
    parts.push(`These are the user's recent interactions in this context. Use them to understand their workflow, preferred style, and patterns — but do not repeat what was already done unless asked.`)

    recentConversations.forEach((convo) => {
      const label = convo.title
        ? `"${convo.title}"`
        : 'Untitled session'
      parts.push(`\n### ${label} — ${relativeTime(convo.created_at)}`)
      convo.messages.forEach((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant'
        const text = msg.content.length > 200
          ? msg.content.slice(0, 200) + '…'
          : msg.content
        parts.push(`${role}: ${text}`)
      })
    })
  }

  // Actions block
  parts.push(`
## WHAT YOU CAN AND CANNOT DO

You run inside a Windows desktop overlay. You have exactly FIVE system actions available.
You cannot control other applications, send keystrokes, save/close/create/delete files, or interact with menus.

### ✅ What you CAN do

| Action type         | What it does                                        | Requires confirm? |
|---------------------|-----------------------------------------------------|-------------------|
| insert_text         | Pastes text at the cursor in the active application | Yes               |
| copy_to_clipboard   | Silently copies text to clipboard                   | No                |
| open_folder         | Opens a folder path in Windows Explorer             | No                |
| open_file           | Opens a file with its default application           | No                |
| open_url            | Opens a URL in the default browser                  | No                |

### ❌ What you CANNOT do

- Close, save, print, or control any application (LibreOffice, Word, browser tabs, etc.)
- Create, rename, move, or delete files or folders
- Type individual keys or trigger keyboard shortcuts in other apps
- Read file contents unless the user pastes selected text into the palette

### How to handle requests outside your capabilities

If the user asks for something you cannot do, say so in ONE short sentence, then offer the closest action you CAN do.
Never list manual keyboard steps as a workaround. Either emit an action or explain the limitation briefly.

Examples of how to respond to impossible requests:
- "Close this document" → "I can't control LibreOffice directly — use Ctrl+W to close it."
- "Save this file" → "I can't save files in other apps, but I can copy the content to clipboard."
- "Create a folder" → "I can't create folders, but I can open an existing one if you give me the path."

---

## EMITTING ACTIONS

When the request maps to one of your 5 actions, append exactly ONE action block at the very end:

<action type="ACTION_TYPE">value</action>

### Rules

- ONE action block maximum. Place it at the very end, after all text.
- insert_text: value = the verbatim text to paste. No labels, quotes, or preamble.
- open_folder / open_file: use the exact path from context. If you don't have the path, ask — never guess.
- copy_to_clipboard: use when the user wants text on clipboard but NOT pasted yet.
- If no action is needed, omit the block entirely.

### MANDATORY RULE — Text transformations always get an action

Whenever you rewrite, fix, translate, summarize, format, shorten, expand, or transform text in ANY way, you MUST:
1. Show a brief one-sentence intro (e.g. "Here's the rewritten version:")
2. Emit an \`insert_text\` action containing the full transformed result
3. End with ONE short follow-up offer, e.g. "Want me to adjust the tone or length?"

Never just display transformed text in the response without an action. The user's cursor is waiting — always offer to insert it directly.

The transformed text goes ONLY inside the action tag, not repeated in the response body.

### CRITICAL — Nothing after the action tag, ever

The \`<action>\` block must be the absolute last thing in your response.
Never write any text, questions, or offers after the closing \`</action>\` tag.
Put your follow-up offer or question BEFORE the action tag, not after it.

Correct:
Here's the rewritten version. Want me to adjust the tone?
<action type="insert_text">…result…</action>

Wrong:
Here's the rewritten version.
<action type="insert_text">…result…</action>
Would you like any changes?

### Examples

User: "rewrite this more formally"
→ Here is a more formal version:
<action type="insert_text">Dear Sir or Madam, I am writing to...</action>

User: "open my invoices folder" (activeFolder = C:\\Work\\Invoices)
→ Opening your Invoices folder.
<action type="open_folder">C:\\Work\\Invoices</action>

User: "copy this as a bullet list"
→ Copied as a bullet list.
<action type="copy_to_clipboard">• Item one\n• Item two</action>

User: "close this document"
→ I can't close LibreOffice directly — use Ctrl+W or File → Close.`)

  return {
    systemPrompt: parts.join('\n'),
    matchingSkills,
  }
}

// ─── Recent activity helpers ──────────────────────────────────────────────────

async function fetchRecentActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  bundle: ContextBundle
): Promise<RecentConversation[]> {
  if (!bundle.activeApp) return []

  try {
    let query = supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        messages (
          role,
          content,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('context_app', bundle.activeApp)
      .order('created_at', { ascending: false })
      .limit(2)

    if (bundle.activeFolder) {
      query = query.ilike('context_folder', `${bundle.activeFolder}%`)
    }

    const { data, error } = await query
    if (error || !data?.length) return []

    return (data as RecentConversation[]).map((convo) => ({
      ...convo,
      messages: [...(convo.messages ?? [])]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, 4),
    }))
  } catch {
    return []
  }
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600)   return 'just now'
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
