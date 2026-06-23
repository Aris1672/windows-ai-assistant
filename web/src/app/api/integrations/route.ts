/**
 * GET    /api/integrations          — list connected integrations
 * POST   /api/integrations          — save a new integration (iCal URL)
 * DELETE /api/integrations?service= — disconnect a service
 */

import { requireAuth, jsonError, jsonOk } from '@/lib/auth'
import { createUserClient, createAdminClient } from '@/lib/supabase'

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  const supabase = createUserClient(accessToken)

  const { data, error } = await supabase
    .from('integrations')
    .select('service, scope, created_at, updated_at')
    .eq('user_id', user.id)

  if (error) return jsonError(error.message, 500)

  // Never return the raw token (iCal URL) to the client
  return jsonOk(data)
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  let body: { service: string; url: string }
  try {
    body = await request.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  if (!body.service) return jsonError('service is required', 400)
  if (!body.url?.trim()) return jsonError('url is required', 400)

  // Basic validation — must be an https URL
  try {
    const parsed = new URL(body.url.trim())
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'webcal:') {
      return jsonError('URL must start with https:// or webcal://', 400)
    }
  } catch {
    return jsonError('Invalid URL format', 400)
  }

  // Normalize webcal:// → https://
  const normalizedUrl = body.url.trim().replace(/^webcal:\/\//i, 'https://')

  // Quick connectivity check — verify the URL actually returns iCal data
  try {
    const probe = await fetch(normalizedUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(6000),
    })
    if (!probe.ok) return jsonError('Could not reach that URL — please check it is correct', 400)
  } catch {
    return jsonError('Could not reach that URL — please check it is correct', 400)
  }

  // Upsert via admin client (access_token holds the iCal URL)
  const admin = createAdminClient()
  const { error: dbError } = await admin
    .from('integrations')
    .upsert({
      user_id:          user.id,
      service:          body.service,
      access_token:     normalizedUrl,
      refresh_token:    '',              // not used for iCal
      token_expires_at: '9999-12-31T00:00:00Z',  // never expires
      scope:            'read',
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'user_id,service' })

  if (dbError) return jsonError(dbError.message, 500)

  return jsonOk({ connected: body.service })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: Request) {
  let user, accessToken
  try {
    ;({ user, accessToken } = await requireAuth(request))
  } catch (response) {
    return response as Response
  }

  const { searchParams } = new URL(request.url)
  const service = searchParams.get('service')
  if (!service) return jsonError('service is required', 400)

  const admin = createAdminClient()
  const { error, count } = await admin
    .from('integrations')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .eq('service', service)

  if (error)       return jsonError(error.message, 500)
  if (count === 0) return jsonError('Integration not found', 404)

  return jsonOk({ disconnected: service })
}
