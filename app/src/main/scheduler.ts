/**
 * app/src/main/scheduler.ts
 *
 * Fetches scheduled skills from the API, registers node-cron jobs,
 * fires skills at their configured times, and shows Windows notifications.
 * Polls every 5 min so Dashboard changes propagate without an app restart.
 */

import { net, Notification } from 'electron'
import cron from 'node-cron'
import log from 'electron-log'
import { store } from './store'
import { openResultWindow } from './resultWindow'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledSkill {
  id:            string
  name:          string
  prompt:        string
  schedule_type: 'daily' | 'weekdays' | 'custom'
  schedule_time: string        // 'HH:MM'
  schedule_days: number[] | null
  last_run_at:   string | null
}

// ─── State ────────────────────────────────────────────────────────────────────

let webUrl      = ''
let pollTimer:  ReturnType<typeof setInterval> | null = null
const activeTasks = new Map<string, cron.ScheduledTask>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toCronExpr(skill: ScheduledSkill): string {
  const [hh, mm] = skill.schedule_time.split(':')
  const h = parseInt(hh, 10)
  const m = parseInt(mm, 10)

  switch (skill.schedule_type) {
    case 'daily':    return `${m} ${h} * * *`
    case 'weekdays': return `${m} ${h} * * 1-5`
    case 'custom': {
      const days = (skill.schedule_days ?? []).join(',') || '*'
      return `${m} ${h} * * ${days}`
    }
  }
}

function getToken(): string | null {
  return store.get('authToken', undefined) ?? null
}

async function tryRefresh(): Promise<string | null> {
  const refresh = store.get('refreshToken', undefined)
  if (!refresh) return null

  try {
    const res = await net.fetch(`${webUrl}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) return null

    const data = await res.json() as { access_token: string; refresh_token: string }
    store.set('authToken',   data.access_token)
    store.set('refreshToken', data.refresh_token)
    return data.access_token
  } catch {
    return null
  }
}

// ─── Skill Execution ──────────────────────────────────────────────────────────

async function runSkill(skill: ScheduledSkill): Promise<void> {
  log.info(`[scheduler] Firing "${skill.name}"`)

  let token = getToken()
  if (!token) {
    log.warn(`[scheduler] No auth token — skipping "${skill.name}"`)
    return
  }

  // Attach any pinned Context Tray clips
  const clips = store.trayGetClips().map((c) => ({
    text:      c.text,
    sourceApp: c.sourceApp,
  }))

  const attempt = async (tok: string, isRetry = false): Promise<void> => {
    let res: Response

    try {
      res = await net.fetch(`${webUrl}/api/skills/run`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${tok}`,
        },
        body: JSON.stringify({ skillId: skill.id, clips }),
      })
    } catch (err) {
      log.error(`[scheduler] Network error running "${skill.name}":`, err)
      return
    }

    if (res.status === 401 && !isRetry) {
      const newToken = await tryRefresh()
      if (newToken) return attempt(newToken, true)
      log.warn(`[scheduler] Auth expired, could not refresh — skipping "${skill.name}"`)
      return
    }

    if (!res.ok) {
      log.error(`[scheduler] HTTP ${res.status} running "${skill.name}"`)
      return
    }

    const { result } = await res.json() as { result: string }
    showNotification(skill.name, result)
  }

  await attempt(token)
}

function showNotification(skillName: string, result: string): void {
  // Windows 10/11: toast notification with an action button
  const notification = new Notification({
    title:          skillName,
    body:           result.length > 150 ? result.slice(0, 148) + '…' : result,
    actions:        [{ type: 'button', text: 'View full' }],
    closeButtonText: 'Dismiss',
  })

  notification.on('action', (_event, index) => {
    if (index === 0) {
      openResultWindow({ title: skillName, content: result })
    }
  })

  notification.show()
  log.info(`[scheduler] Notification shown for "${skillName}"`)
}

// ─── Cron Job Management ──────────────────────────────────────────────────────

function unregisterSkill(id: string): void {
  const task = activeTasks.get(id)
  if (task) {
    task.stop()
    activeTasks.delete(id)
  }
}

function registerSkill(skill: ScheduledSkill): void {
  unregisterSkill(skill.id) // stop previous job if config changed

  const expr = toCronExpr(skill)

  if (!cron.validate(expr)) {
    log.warn(`[scheduler] Invalid cron expression "${expr}" for skill "${skill.name}"`)
    return
  }

  const task = cron.schedule(expr, () => runSkill(skill), {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  activeTasks.set(skill.id, task)
  log.info(`[scheduler] Registered "${skill.name}" at ${expr}`)
}

// ─── API Sync ─────────────────────────────────────────────────────────────────

async function syncFromApi(): Promise<void> {
  const token = getToken()
  if (!token) return // user not logged in yet

  let skills: ScheduledSkill[]

  try {
    const res = await net.fetch(`${webUrl}/api/skills/scheduled`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 401) {
      const newToken = await tryRefresh()
      if (!newToken) return
      const retry = await net.fetch(`${webUrl}/api/skills/scheduled`, {
        headers: { Authorization: `Bearer ${newToken}` },
      })
      if (!retry.ok) return
      skills = (await retry.json()) as ScheduledSkill[]
    } else if (!res.ok) {
      return
    } else {
      skills = (await res.json()) as ScheduledSkill[]
    }
  } catch (err) {
    log.error('[scheduler] Failed to fetch scheduled skills:', err)
    return
  }

  // Stop any jobs no longer in the API response
  const incomingIds = new Set(skills.map((s) => s.id))
  for (const [id] of activeTasks) {
    if (!incomingIds.has(id)) {
      unregisterSkill(id)
      log.info(`[scheduler] Unregistered removed skill ${id}`)
    }
  }

  // Register / re-register each incoming skill
  for (const skill of skills) {
    registerSkill(skill)
  }

  log.info(`[scheduler] Synced — ${skills.length} scheduled skill(s) active`)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once from main/index.ts inside app.whenReady()
 */
export function initScheduler(url: string): void {
  webUrl = url
  syncFromApi()
  // Re-sync every 5 minutes so Dashboard changes propagate without restart
  pollTimer = setInterval(syncFromApi, 5 * 60 * 1000)
  log.info('[scheduler] Initialized')
}

/**
 * Call when a new token is stored (e.g. after login) so jobs start immediately
 * without waiting for the next poll cycle.
 */
export function refreshScheduler(): void {
  syncFromApi()
}

/**
 * Call from before-quit to clean up all cron jobs.
 */
export function destroyScheduler(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  for (const [id] of activeTasks) {
    unregisterSkill(id)
  }
  log.info('[scheduler] Destroyed')
}
