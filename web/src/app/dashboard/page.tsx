'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { BookOpen, Zap, History, Plus, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState({ instructions: 0, skills: 0, actions: 0 })
  const [recentActions, setRecentActions] = useState<{ id: string; action_label: string; context_app: string | null; status: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ count: iCount }, { count: sCount }, { data: actions }] = await Promise.all([
        supabase.from('instructions').select('*', { count: 'exact', head: true }),
        supabase.from('skills').select('*', { count: 'exact', head: true }),
        supabase.from('actions').select('id, action_label, context_app, status, created_at').order('created_at', { ascending: false }).limit(5),
      ])
      setStats({ instructions: iCount ?? 0, skills: sCount ?? 0, actions: 0 })
      setRecentActions(actions ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { label: 'Instructions', value: stats.instructions, icon: BookOpen, href: '/dashboard/instructions', color: 'var(--accent)' },
    { label: 'Skills',       value: stats.skills,       icon: Zap,      href: '/dashboard/skills',       color: '#A78BFA' },
    { label: 'Actions run',  value: recentActions.length, icon: History, href: '/dashboard/history',     color: '#60A5FA' },
  ]

  return (
    <div style={{ padding: '2.5rem', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.6rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          marginBottom: '0.375rem',
          color: 'var(--text-primary)',
        }}>
          Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Your AI assistant at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {statCards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <div
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
                transition: 'border-color 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{
                width: '36px', height: '36px',
                borderRadius: '8px',
                background: `${color}18`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={16} strokeWidth={1.8} style={{ color }} />
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1,
                  marginBottom: '0.25rem',
                }}>
                  {loading ? '—' : value}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: '0.875rem',
        }}>
          Quick actions
        </h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/dashboard/instructions/new" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }}>
              <Plus size={14} /> New instruction
            </button>
          </Link>
          <Link href="/dashboard/skills/new" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }}>
              <Plus size={14} /> New skill
            </button>
          </Link>
        </div>
      </div>

      {/* Recent actions */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <h2 style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            Recent actions
          </h2>
          <Link href="/dashboard/history" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>
          ) : recentActions.length === 0 ? (
            <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No actions yet. Press <kbd style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '0.1rem 0.4rem',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
              }}>Ctrl + Space</kbd> in the desktop app to get started.
            </div>
          ) : (
            recentActions.map((action, i) => (
              <div
                key={action.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.875rem 1.25rem',
                  borderBottom: i < recentActions.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    {action.action_label}
                  </div>
                  {action.context_app && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.context_app}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`badge ${action.status === 'done' ? 'badge-accent' : 'badge-muted'}`}>
                    {action.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(action.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
