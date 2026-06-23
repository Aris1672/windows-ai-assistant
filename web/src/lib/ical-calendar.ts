/**
 * web/src/lib/ical-calendar.ts
 *
 * Fetches a user's calendar via their private iCal (.ics) URL.
 * Works with Google Calendar, Apple Calendar, Outlook, Yandex — any iCal source.
 * No OAuth, no API keys, no token refresh needed.
 *
 * Timezone handling:
 *   - Reads X-WR-TIMEZONE from the iCal header (Google Calendar always includes it)
 *   - Uses it to determine the correct "tomorrow" window and to format times
 *   - Falls back to UTC if the header is absent
 */

import { createAdminClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  summary:     string
  start:       string   // ISO string (UTC)
  end:         string
  location:    string | null
  description: string | null
  isAllDay:    boolean
}

interface ParseResult {
  events:   CalendarEvent[]
  timezone: string | null   // e.g. 'Europe/Moscow'
}

// ─── iCal Parser ──────────────────────────────────────────────────────────────

function parseIcs(icsText: string): ParseResult {
  const events: CalendarEvent[] = []
  const lines = icsText
    .replace(/\r\n[ \t]/g, '') // unfold wrapped lines
    .replace(/\r/g, '')
    .split('\n')

  let inEvent  = false
  let current: Record<string, string> = {}
  let timezone: string | null = null

  for (const raw of lines) {
    const line = raw.trim()

    // Extract calendar-level timezone before any VEVENT
    if (!inEvent && line.startsWith('X-WR-TIMEZONE:')) {
      timezone = line.slice('X-WR-TIMEZONE:'.length).trim()
      continue
    }

    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      current = {}
      continue
    }

    if (line === 'END:VEVENT') {
      inEvent = false
      if (current.SUMMARY) {
        const startRaw = current['DTSTART;VALUE=DATE'] ?? current.DTSTART ?? ''
        const endRaw   = current['DTEND;VALUE=DATE']   ?? current.DTEND   ?? ''
        const isAllDay = !!current['DTSTART;VALUE=DATE']

        events.push({
          summary:     decodeIcalText(current.SUMMARY ?? '(No title)'),
          start:       parseIcalDate(startRaw),
          end:         parseIcalDate(endRaw),
          location:    current.LOCATION    ? decodeIcalText(current.LOCATION)    : null,
          description: current.DESCRIPTION ? decodeIcalText(current.DESCRIPTION) : null,
          isAllDay,
        })
      }
      continue
    }

    if (!inEvent) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    let key       = line.slice(0, colonIdx)
    const val     = line.slice(colonIdx + 1)

    if      (key.startsWith('DTSTART;VALUE=DATE')) key = 'DTSTART;VALUE=DATE'
    else if (key.startsWith('DTEND;VALUE=DATE'))   key = 'DTEND;VALUE=DATE'
    else if (key.startsWith('DTSTART'))            key = 'DTSTART'
    else if (key.startsWith('DTEND'))              key = 'DTEND'

    current[key] = val
  }

  return { events, timezone }
}

function parseIcalDate(raw: string): string {
  if (!raw) return ''
  // All-day: 20260623 → 2026-06-23
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`
  }
  // DateTime: 20260623T090000Z or 20260623T090000
  if (/^\d{8}T\d{6}/.test(raw)) {
    const iso = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T${raw.slice(9,11)}:${raw.slice(11,13)}:${raw.slice(13,15)}${raw.endsWith('Z') ? 'Z' : 'Z'}`
    const d = new Date(iso)
    return isNaN(d.getTime()) ? raw : d.toISOString()
  }
  return raw
}

function decodeIcalText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

// ─── Timezone-aware date helpers ──────────────────────────────────────────────

/**
 * Returns "tomorrow" as YYYY-MM-DD in the given timezone.
 * Vercel runs in UTC — without this, Moscow midnight events land on the wrong day.
 */
function getTomorrowDateString(tz: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year:  'numeric',
    month: '2-digit',
    day:   '2-digit',
  })
  // "today" in the target timezone
  const todayStr = formatter.format(new Date())
  const today    = new Date(todayStr + 'T00:00:00Z')
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(today.getUTCDate() + 1)
  return tomorrow.toISOString().slice(0, 10)  // 'YYYY-MM-DD'
}

/**
 * Returns the local date string (YYYY-MM-DD) of a UTC ISO timestamp
 * as seen in the given timezone.
 */
function toLocalDateString(isoUtc: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
  }).format(new Date(isoUtc))
}

/**
 * Formats a UTC ISO timestamp as HH:MM in the given timezone.
 */
function formatTime(isoUtc: string, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour:     '2-digit',
    minute:   '2-digit',
  }).format(new Date(isoUtc))
}

/**
 * Formats tomorrow's date label in the given timezone.
 */
function formatDateLabel(tomorrowStr: string, tz: string): string {
  // tomorrowStr is 'YYYY-MM-DD' — treat as local midnight in the tz
  const d = new Date(tomorrowStr + 'T12:00:00Z')
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    month:   'long',
    day:     'numeric',
  }).format(d)
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function fetchTomorrowsEvents(
  userId: string
): Promise<{ events: CalendarEvent[]; timezone: string } | null> {
  const admin = createAdminClient()

  const { data: integration, error } = await admin
    .from('integrations')
    .select('access_token')
    .eq('user_id', userId)
    .eq('service', 'ical')
    .single()

  if (error || !integration?.access_token) return null

  let icsText: string
  try {
    const res = await fetch(integration.access_token, {
      headers: { 'User-Agent': 'WindowsAI-Calendar/1.0' },
      signal:  AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.error(`[ical] Fetch failed: ${res.status}`)
      return null
    }
    icsText = await res.text()
  } catch (err) {
    console.error('[ical] Fetch error:', err)
    return null
  }

  const { events, timezone } = parseIcs(icsText)
  const tz = timezone ?? 'UTC'

  // "tomorrow" as seen in the user's timezone
  const tomorrowStr = getTomorrowDateString(tz)

  const tomorrowEvents = events
    .filter(e => {
      if (e.isAllDay) return e.start === tomorrowStr
      return toLocalDateString(e.start, tz) === tomorrowStr
    })
    .sort((a, b) => a.start.localeCompare(b.start))

  console.log(`[ical] tz=${tz} tomorrow=${tomorrowStr} events=${tomorrowEvents.length}`)

  return { events: tomorrowEvents, timezone: tz }
}

// ─── Format for System Prompt ─────────────────────────────────────────────────

export function formatEventsForPrompt(
  result: { events: CalendarEvent[]; timezone: string }
): string {
  const { events, timezone: tz } = result
  const tomorrowStr = getTomorrowDateString(tz)
  const dateLabel   = formatDateLabel(tomorrowStr, tz)

  if (events.length === 0) {
    return `## Calendar — ${dateLabel}\nNo events scheduled.`
  }

  const lines = events.map(e => {
    if (e.isAllDay) {
      return `- [All day] ${e.summary}${e.location ? ` @ ${e.location}` : ''}`
    }
    const start = formatTime(e.start, tz)
    const end   = formatTime(e.end,   tz)
    return [
      `- ${start}–${end}: ${e.summary}`,
      e.location    ? `  Location: ${e.location}` : null,
      e.description ? `  Notes: ${e.description.slice(0, 120)}` : null,
    ].filter(Boolean).join('\n')
  })

  return `## Calendar — ${dateLabel} (${tz})\n${lines.join('\n')}`
}
