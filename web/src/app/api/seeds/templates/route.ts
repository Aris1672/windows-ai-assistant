/**
 * POST /api/seeds/templates
 * 
 * Bulk-import pre-built skill templates for a user.
 * Call with ?pack=Developer,Writer,Finance,Support or individual pack names.
 * Returns count of imported skills.
 */

import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient } from '@/lib/supabase'
import { SKILL_TEMPLATES } from '@/lib/skill-templates'

export async function POST(request: Request) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  // Parse query params to get requested packs
  const url = new URL(request.url)
  const packsParam = url.searchParams.get('pack') || 'Developer,Writer,Finance,Support'
  const requestedPacks = packsParam.split(',').map((p) => p.trim()) as Array<
    'Developer' | 'Writer' | 'Finance' | 'Support'
  >

  // Filter templates by requested packs
  const templatesToImport = SKILL_TEMPLATES.filter((t) => requestedPacks.includes(t.packName))

  if (templatesToImport.length === 0) {
    return jsonError('No templates found for requested packs', 400)
  }

  const supabase = createUserClient(accessToken)

 // Check if user already imported these specific templates to avoid duplicates
// (But allow import even if they have other skills like the default 4)
const { data: existingTemplates } = await supabase
  .from('skills')
  .select('id')
  .eq('user_id', user.id)
  .in('name', templatesToImport.map((t) => t.name))
  .limit(1)

if ((existingTemplates?.length ?? 0) > 0) {
  return jsonError(
    'You have already imported these templates. Delete them first if you want to re-import.',
    400
  )
}

  // Prepare bulk insert data
  const now = new Date().toISOString()
  const insertData = templatesToImport.map((template, index) => ({
    user_id: user.id,
    name: template.name,
    description: template.description,
    prompt: template.prompt,
    context_app: template.contextApp ?? null,
    context_folder: template.contextFolder ?? null,
    is_destructive: template.isDestructive,
    is_active: true,
    sort_order: index,
    created_at: now,
    updated_at: now,
  }))

  const { data, error } = await supabase
    .from('skills')
    .insert(insertData)
    .select('id, name')

  if (error) {
    return jsonError(`Failed to import templates: ${error.message}`, 500)
  }

  return jsonOk({
    imported: (data ?? []).length,
    templates: (data ?? []).map((s) => s.name),
    packs: requestedPacks,
  })
}
