'use client'

/**
 * web/src/app/dashboard/scheduled/page.tsx
 *
 * Scheduled Skills dashboard page.
 * Fetches skills via /api/skills (Vercel → Supabase) — no direct Supabase access.
 * Lists all skills; each can be toggled on/off with an inline schedule config panel.
 */

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  id:               string
  name:             string
  description:      string | null
  prompt:           string
  is_active:        boolean
  schedule_enabled: boolean
  schedule_type:    'daily' | 'weekdays' | 'custom' | null
  schedule_time:    string | null
  schedule_days:    number[] | null
  last_run_at:      string | null
}

type ScheduleType = 'daily' | 'weekdays' | 'custom'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TYPE_LABELS: Record<ScheduleType, string> = {
  daily:    'Every day',
  weekdays: 'Weekdays only',
  custom:   'Custom days',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastRun(iso: string | null): string {
  if (!iso) return 'Never'
  const d    = new Date(iso)
  const diffH = Math.floor((Date.now() - d.getTime()) / 3_600_000)
  if (diffH < 1)  return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7)  return `${diffD}d ago`
  return d.toLocaleDateString()
}

function nextRunLabel(skill: Skill): string {
  if (!skill.schedule_enabled || !skill.schedule_time) return '—'
  const [h, m] = skill.schedule_time.split(':').map(Number)
  const next   = new Date()
  next.setHours(h, m, 0, 0)
  if (next <= new Date()) next.setDate(next.getDate() + 1)

  const timeLabel = next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (skill.schedule_type === 'weekdays') {
    const dow = next.getDay()
    if (dow === 0) next.setDate(next.getDate() + 1)
    if (dow === 6) next.setDate(next.getDate() + 2)
    return `${next.toLocaleDateString([], { weekday: 'short' })} at ${timeLabel}`
  }
  if (skill.schedule_type === 'custom' && skill.schedule_days?.length) {
    for (let i = 0; i < 7; i++) {
      const c = new Date(next)
      c.setDate(next.getDate() + i)
      if (skill.schedule_days.includes(c.getDay())) {
        return `${c.toLocaleDateString([], { weekday: 'short' })} at ${timeLabel}`
      }
    }
  }
  return `Tomorrow at ${timeLabel}`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScheduledPage() {
  const [skills,   setSkills]   = useState<Skill[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Draft state for the open config panel
  const [draftType, setDraftType] = useState<ScheduleType>('daily')
  const [draftTime, setDraftTime] = useState('08:00')
  const [draftDays, setDraftDays] = useState<number[]>([1, 2, 3, 4, 5])

  // ── Fetch all skills through the Vercel API route ─────────────────────────
  const fetchSkills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/skills')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load skills')

      // jsonOk() returns the array directly (not wrapped in { data: [...] })
      const list: Skill[] = Array.isArray(json) ? json : (json.data ?? [])
      setSkills(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSkills() }, [fetchSkills])

  // ── Open config panel with skill's current schedule (or defaults) ─────────
  function openPanel(skill: Skill) {
    setExpanded(skill.id)
    setDraftType(skill.schedule_type ?? 'daily')
    setDraftTime(skill.schedule_time ?? '08:00')
    setDraftDays(skill.schedule_days ?? [1, 2, 3, 4, 5])
  }

  // ── Toggle on/off ─────────────────────────────────────────────────────────
  async function toggleSchedule(skill: Skill) {
    if (!skill.schedule_enabled) {
      // Turning on: show config panel first, don't PATCH yet
      openPanel(skill)
      return
    }
    // Turning off: disable immediately
    await patchSkill(skill.id, { schedule_enabled: false })
    setExpanded(null)
  }

  // ── Save schedule from panel ──────────────────────────────────────────────
  async function saveSchedule(skillId: string) {
    if (draftType === 'custom' && draftDays.length === 0) {
      setError('Select at least one day for a custom schedule.')
      return
    }
    await patchSkill(skillId, {
      schedule_enabled: true,
      schedule_type:    draftType,
      schedule_time:    draftTime,
      schedule_days:    draftType === 'custom' ? draftDays : null,
    })
    setExpanded(null)
  }

  // ── PATCH via Vercel API ──────────────────────────────────────────────────
  async function patchSkill(id: string, patch: Record<string, unknown>) {
    setSaving(id)
    setError(null)
    try {
      const res  = await fetch(`/api/skills/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Save failed')

      // Merge updated skill back — handle both direct and wrapped responses
      const updated: Skill = json.data ?? json
      setSkills(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(null)
    }
  }

  function toggleDay(day: number) {
    setDraftDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const scheduled = skills.filter(s => s.schedule_enabled)
  const others    = skills.filter(s => !s.schedule_enabled)

  return (
    <div style={{ padding: '2rem', maxWidth: '720px' }}>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.35rem' }}>
          Scheduled Skills
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          Run a skill automatically on a schedule — results arrive as a Windows notification.
          Context Tray clips are included automatically if you have any pinned.
        </p>
      </div>

      {error && (
        <div style={{
          padding:      '0.65rem 1rem',
          background:   'rgba(239,68,68,0.1)',
          border:       '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          color:        'var(--error, #f87171)',
          fontSize:     '0.8rem',
          marginBottom: '1.25rem',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>

      ) : skills.length === 0 ? (
        <div style={{
          padding:      '3rem',
          textAlign:    'center',
          color:        'var(--text-muted)',
          fontSize:     '0.875rem',
          border:       '1px dashed var(--border)',
          borderRadius: '12px',
        }}>
          You haven't created any skills yet.{' '}
          <a href="/dashboard/skills" style={{ color: 'var(--accent)' }}>Create one first</a>.
        </div>

      ) : (
        <>
          {scheduled.length > 0 && (
            <section style={{ marginBottom: '2rem' }}>
              <SectionLabel>Active — {scheduled.length}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {scheduled.map(skill => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    expanded={expanded === skill.id}
                    saving={saving === skill.id}
                    draftType={draftType}
                    draftTime={draftTime}
                    draftDays={draftDays}
                    onToggle={() => toggleSchedule(skill)}
                    onExpand={() => expanded === skill.id ? setExpanded(null) : openPanel(skill)}
                    onSave={() => saveSchedule(skill.id)}
                    onCancel={() => setExpanded(null)}
                    setDraftType={setDraftType}
                    setDraftTime={setDraftTime}
                    toggleDay={toggleDay}
                  />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <SectionLabel>Not scheduled — {others.length}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {others.map(skill => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    expanded={expanded === skill.id}
                    saving={saving === skill.id}
                    draftType={draftType}
                    draftTime={draftTime}
                    draftDays={draftDays}
                    onToggle={() => toggleSchedule(skill)}
                    onExpand={() => expanded === skill.id ? setExpanded(null) : openPanel(skill)}
                    onSave={() => saveSchedule(skill.id)}
                    onCancel={() => setExpanded(null)}
                    setDraftType={setDraftType}
                    setDraftTime={setDraftTime}
                    toggleDay={toggleDay}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize:      '0.7rem',
      fontWeight:    600,
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      color:         'var(--text-muted)',
      marginBottom:  '0.75rem',
    }}>
      {children}
    </div>
  )
}

// ─── Skill Row ────────────────────────────────────────────────────────────────

interface SkillRowProps {
  skill:        Skill
  expanded:     boolean
  saving:       boolean
  draftType:    ScheduleType
  draftTime:    string
  draftDays:    number[]
  onToggle:     () => void
  onExpand:     () => void
  onSave:       () => void
  onCancel:     () => void
  setDraftType: (t: ScheduleType) => void
  setDraftTime: (t: string) => void
  toggleDay:    (d: number) => void
}

function SkillRow({
  skill, expanded, saving, draftType, draftTime, draftDays,
  onToggle, onExpand, onSave, onCancel,
  setDraftType, setDraftTime, toggleDay,
}: SkillRowProps) {
  return (
    <div style={{
      background:   'var(--bg-2, #1a1a1a)',
      border:       `1px solid ${skill.schedule_enabled ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--border, #2a2a2a)'}`,
      borderRadius: '10px',
      overflow:     'hidden',
      transition:   'border-color 0.2s',
    }}>

      {/* ── Row header ───────────────────────────────────────────────────── */}
      <div
        onClick={onExpand}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', cursor: 'pointer' }}
      >
        {/* Toggle switch */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          style={{
            width:        '36px',
            height:       '20px',
            borderRadius: '10px',
            background:   skill.schedule_enabled ? 'var(--accent, #00c9a0)' : 'var(--border, #333)',
            position:     'relative',
            cursor:       'pointer',
            flexShrink:   0,
            transition:   'background 0.2s',
          }}
        >
          <div style={{
            position:     'absolute',
            top:          '3px',
            left:         skill.schedule_enabled ? '19px' : '3px',
            width:        '14px',
            height:       '14px',
            borderRadius: '50%',
            background:   'white',
            transition:   'left 0.2s',
          }} />
        </div>

        {/* Name + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '2px' }}>
            {skill.name}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {skill.schedule_enabled && skill.schedule_type && skill.schedule_time
              ? <>
                  {TYPE_LABELS[skill.schedule_type]} at {skill.schedule_time}
                  {skill.schedule_type === 'custom' && skill.schedule_days?.length
                    ? ` (${skill.schedule_days.map(d => DAY_LABELS[d]).join(', ')})`
                    : ''}
                  {' · '}Next: {nextRunLabel(skill)}
                </>
              : skill.description ?? 'No schedule set — click to configure'
            }
          </div>
        </div>

        {/* Last run */}
        {skill.schedule_enabled && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
            <div>Last run</div>
            <div style={{ color: 'var(--text)' }}>{formatLastRun(skill.last_run_at)}</div>
          </div>
        )}

        {/* Chevron */}
        <div style={{
          color:      'var(--text-muted)',
          fontSize:   '10px',
          transform:  expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }}>▾</div>
      </div>

      {/* ── Config panel ─────────────────────────────────────────────────── */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border, #2a2a2a)', padding: '16px 14px', background: 'var(--bg, #141414)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Repeat type */}
            <div>
              <Label>Repeat</Label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['daily', 'weekdays', 'custom'] as ScheduleType[]).map(t => (
                  <Chip key={t} active={draftType === t} onClick={() => setDraftType(t)}>
                    {TYPE_LABELS[t]}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Day picker — only for custom */}
            {draftType === 'custom' && (
              <div>
                <Label>Days</Label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {DAY_LABELS.map((label, i) => (
                    <Chip key={i} active={draftDays.includes(i)} onClick={() => toggleDay(i)}
                      style={{ width: '38px', padding: '5px 0', textAlign: 'center' }}
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {/* Time */}
            <div>
              <Label>Time</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="time"
                  value={draftTime}
                  onChange={(e) => setDraftTime(e.target.value)}
                  style={{
                    background:   'var(--bg-2, #1a1a1a)',
                    border:       '1px solid var(--border, #2a2a2a)',
                    borderRadius: '7px',
                    padding:      '6px 10px',
                    color:        'var(--text)',
                    fontSize:     '0.875rem',
                    outline:      'none',
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Your local time</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '2px' }}>
              <button
                onClick={onSave}
                disabled={saving}
                style={{
                  padding:      '7px 18px',
                  borderRadius: '7px',
                  border:       'none',
                  background:   'var(--accent, #00c9a0)',
                  color:        'var(--bg, #141414)',
                  fontWeight:   700,
                  fontSize:     '0.8rem',
                  cursor:       saving ? 'not-allowed' : 'pointer',
                  opacity:      saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save schedule'}
              </button>
              <button
                onClick={onCancel}
                style={{
                  padding:      '7px 14px',
                  borderRadius: '7px',
                  border:       '1px solid var(--border, #2a2a2a)',
                  background:   'transparent',
                  color:        'var(--text-muted)',
                  fontSize:     '0.8rem',
                  cursor:       'pointer',
                }}
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize:      '0.75rem',
      fontWeight:    600,
      color:         'var(--text-muted)',
      marginBottom:  '6px',
      letterSpacing: '0.03em',
    }}>
      {children}
    </div>
  )
}

function Chip({ children, active, onClick, style }: {
  children: React.ReactNode
  active:   boolean
  onClick:  () => void
  style?:   React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:      '5px 12px',
        borderRadius: '6px',
        border:       `1px solid ${active ? 'transparent' : 'var(--border, #2a2a2a)'}`,
        background:   active ? 'var(--accent, #00c9a0)' : 'var(--bg-2, #1a1a1a)',
        color:        active ? 'var(--bg, #141414)' : 'var(--text)',
        fontWeight:   active ? 700 : 400,
        fontSize:     '0.8rem',
        cursor:       'pointer',
        transition:   'all 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
