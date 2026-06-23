/**
 * web/src/lib/google-calendar.ts
 *
 * Fetches a user's calendar via their private iCal (.ics) URL.
 * Works with Google Calendar, Apple Calendar, Outlook, Yandex — any iCal source.
 * No OAuth, no API keys, no token refresh needed.
 */

import { createAdminClient } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  summary:  string
  start:    string
  end:      string
  location: string | null
  description: string | null
  isAllDay: boolean
}

// ─── iCal Parser ──────────────────────────────────────────────────────────────
// Minimal parser — handles VEVENT blocks only, no external dependencies needed.

function parseIcs(icsText: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const lines = icsText
    .replace(/\r\n[ \t]/g, '')  // unfold wrapped lines
    .replace(/\r/g, '')
    .split('\n')

  let inEvent = false
  let current: Record<string, string> = {}

  for (const raw of lines) {
    const line = raw.trim()

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

    // Handle properties with parameters like DTSTART;TZID=Europe/Moscow:20260623T090000
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    let key   = line.slice(0, colonIdx)
    const val = line.slice(colonIdx + 1)

    // Normalize DTSTART/DTEND with TZID parameter to plain key
    if (key.startsWith('DTSTART;VALUE=DATE')) key = 'DTSTART;VALUE=DATE'
    else if (key.startsWith('DTEND;VALUE=DATE'))   key = 'DTEND;VALUE=DATE'
    else if (key.startsWith('DTSTART'))             key = 'DTSTART'
    else if (key.startsWith('DTEND'))               key = 'DTEND'

    current[key] = val
  }

  return events
}

function parseIcalDate(raw: string): string {
  if (!raw) return ''
  // All-day: 20260623 → 2026-06-23
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`
  }
  // DateTime: 20260623T090000Z or 20260623T090000
  if (/^\d{8}T\d{6}/.test(raw)) {
    const d = new Date(
      `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T${raw.slice(9,11)}:${raw.slice(11,13)}:${raw.slice(13,15)}${raw.endsWith('Z') ? 'Z' : ''}`
    )
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

// ─── Filter to a specific day ─────────────────────────────────────────────────

function isSameDay(eventStart: string, targetDate: Date): boolean {
  const d = new Date(eventStart)
  if (isNaN(d.getTime())) {
    // All-day format: '2026-06-23'
    return eventStart.startsWith(targetDate.toISOString().slice(0, 10))
  }
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth()    === targetDate.getMonth()    &&
    d.getDate()     === targetDate.getDate()
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function fetchTomorrowsEvents(userId: string): Promise<CalendarEvent[] | null> {
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

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const allEvents      = parseIcs(icsText)
  const tomorrowEvents = allEvents
    .filter(e => isSameDay(e.start, tomorrow))
    .sort((a, b) => a.start.localeCompare(b.start))

  return tomorrowEvents
}

// ─── Format for System Prompt ─────────────────────────────────────────────────

export function formatEventsForPrompt(events: CalendarEvent[]): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateLabel = tomorrow.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  if (events.length === 0) {
    return `## Calendar — ${dateLabel}\nNo events scheduled.`
  }

  const lines = events.map(e => {
    if (e.isAllDay) {
      return `- [All day] ${e.summary}${e.location ? ` @ ${e.location}` : ''}`
    }
    const start = new Date(e.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const end   = new Date(e.end).toLocaleTimeString('en-US',   { hour: '2-digit', minute: '2-digit' })
    return [
      `- ${start}–${end}: ${e.summary}`,
      e.location    ? `  Location: ${e.location}` : null,
      e.description ? `  Notes: ${e.description.slice(0, 120)}` : null,
    ].filter(Boolean).join('\n')
  })

  return `## Calendar — ${dateLabel}\n${lines.join('\n')}`
}
