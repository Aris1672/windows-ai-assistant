'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Zap, History, Plus, ArrowRight, Download } from 'lucide-react'
import TemplateOnboarding from '@/components/TemplateOnboarding'

const DOWNLOAD_URL = '/api/download'

interface RecentAction {
  id: string
  action_label: string
  context_app: string | null
  status: string
  created_at: string
}

interface Stats {
  instructions: number
  skills: number
  actions: number
}

// ─── Download Modal ───────────────────────────────────────────────────────────

function DownloadModal({ onClose }: { onClose: () => void }) {
  const steps = [
    { n: '1', label: 'Download the installer', sub: 'Click the button below — it\'s free during beta.' },
    { n: '2', label: 'Run & install',           sub: 'Double-click the .exe and follow the setup wizard.' },
    { n: '3', label: 'Press Ctrl + Space',       sub: 'From any app, anywhere on Windows. That\'s it.' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '2.25rem',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Icon + heading */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: 'rgba(0,245,160,0.08)', border: '1px solid rgba(0,245,160,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <Download size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700,
            color: 'var(--text-primary)', marginBottom: '0.5rem',
          }}>
            Get the desktop app
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.55 }}>
            Your dashboard is ready. Now install the Windows app to start using{' '}
            <kbd style={{
              background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: '4px', padding: '0.1rem 0.4rem',
              fontSize: '0.75rem', fontFamily: 'monospace',
            }}>Ctrl + Space</kbd>.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1.75rem' }}>
          {steps.map(({ n, label, sub }) => (
            <div key={n} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)',
              }}>
                {n}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                  {label}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <a
          href={DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', textDecoration: 'none', marginBottom: '0.75rem' }}
        >
          <button style={{
            width: '100%', padding: '0.75rem',
            borderRadius: '8px', border: 'none',
            background: 'var(--accent)', color: '#000',
            fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          }}>
            <Download size={16} /> Download for Windows
          </button>
        </a>
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '0.6rem',
            borderRadius: '8px', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)',
            fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          I'll do this later
        </button>
      </div>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ instructions: 0, skills: 0, actions: 0 })
  const [recentActions, setRecentActions] = useState<RecentAction[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [instructionsRes, skillsRes, actionsRes] = await Promise.all([
        fetch('/api/instructions', { credentials: 'include' }),
        fetch('/api/skills',      { credentials: 'include' }),
        fetch('/api/actions',     { credentials: 'include' }),
      ])

      const instructions = await instructionsRes.json()
      const skills       = await skillsRes.json()
      const actionsData  = await actionsRes.json()

      const actionsList = Array.isArray(actionsData) ? actionsData : actionsData?.data ?? []

      setStats({
        instructions: instructions?.length ?? 0,
        skills:       skills?.length       ?? 0,
        actions:      actionsList?.length  ?? 0,
      })

      setRecentActions(Array.isArray(actionsList) ? actionsList.slice(0, 5) : [])

      const hasImportedTemplates = (skills?.length ?? 0) > 4
      if (!hasImportedTemplates) setShowOnboarding(true)

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // When onboarding completes (import or skip) → show download modal
  function handleOnboardingComplete() {
    setShowOnboarding(false)
    setShowDownloadModal(true)
  }

  const statCards = [
    { label: 'Instructions', value: stats.instructions, icon: BookOpen, href: '/dashboard/instructions', color: 'var(--accent)' },
    { label: 'Skills',       value: stats.skills,       icon: Zap,      href: '/dashboard/skills',       color: '#A78BFA' },
    { label: 'Actions run',  value: stats.actions,      icon: History,  href: '/dashboard/history',       color: '#60A5FA' },
  ]

  return (
    <>
      <div style={{ padding: '2.5rem', maxWidth: '900px' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
            Overview
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Your AI assistant at a glance.
          </p>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
              {statCards.map(({ label, value, icon: Icon, href, color }) => (
                <Link key={label} href={href} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} strokeWidth={1.8} style={{ color }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '0.25rem' }}>
                        {value.toLocaleString()}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{label}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Download banner */}
            <div style={{ marginBottom: '2.5rem' }}>
              <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div className="card" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(0,245,160,0.04)', borderColor: 'rgba(0,245,160,0.15)',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Download size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
                        Download for Windows
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Get the desktop app to start using Ctrl + Space
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </div>
              </a>
            </div>

            {/* Quick actions */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
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
                <h2 style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Recent actions
                </h2>
                <Link href="/dashboard/history" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {recentActions.length === 0 ? (
                  <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No actions yet. Press{' '}
                    <kbd style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      Ctrl + Space
                    </kbd>{' '}
                    in the desktop app to get started.
                  </div>
                ) : (
                  recentActions.map((action, i) => (
                    <div key={action.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', borderBottom: i < recentActions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{action.action_label}</div>
                        {action.context_app && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.context_app}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className={`badge ${action.status === 'done' ? 'badge-accent' : 'badge-muted'}`}>{action.status}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(action.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Skills onboarding modal */}
      <TemplateOnboarding open={showOnboarding} onComplete={handleOnboardingComplete} />

      {/* Download modal — shown after onboarding */}
      {showDownloadModal && <DownloadModal onClose={() => setShowDownloadModal(false)} />}
    </>
  )
}
