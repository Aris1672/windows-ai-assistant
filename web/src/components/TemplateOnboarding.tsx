'use client'

import { useState } from 'react'
import { Download, Check } from 'lucide-react'
import { TEMPLATE_PACKS } from '@/lib/skill-templates'

interface TemplateOnboardingProps {
  onComplete?: () => void
  open: boolean
}

export default function TemplateOnboarding({ onComplete, open }: TemplateOnboardingProps) {
  const [selectedPacks, setSelectedPacks] = useState<string[]>(['Developer', 'Writer'])
  const [loading, setLoading] = useState(false)
  const [imported, setImported] = useState(false)

  if (!open) return null

  function togglePack(packName: string) {
    setSelectedPacks((prev) =>
      prev.includes(packName) ? prev.filter((p) => p !== packName) : [...prev, packName]
    )
  }

  async function handleImport() {
    if (selectedPacks.length === 0) return

    setLoading(true)
    const packsQuery = selectedPacks.join(',')
    const res = await fetch(`/api/seeds/templates?pack=${packsQuery}`, {
      method: 'POST',
      credentials: 'include',
    })
    const data = await res.json()
    setLoading(false)

    if (data.imported) {
      setImported(true)
      setTimeout(() => {
        onComplete?.()
      }, 1500)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '2.5rem',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {imported ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div
              style={{
                fontSize: '3rem',
                marginBottom: '1rem',
              }}
            >
              ✨
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              All set!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Your skill templates are ready. Hit Ctrl+Space to get started.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.375rem' }}>
              Get instant value with skill templates
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Import pre-built packs tailored to your workflow. You can customize them anytime.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              {TEMPLATE_PACKS.map((pack) => (
                <label
                  key={pack.name}
                  onClick={() => togglePack(pack.name)}
                  style={{
                    padding: '1rem',
                    border: selectedPacks.includes(pack.name)
                      ? '2px solid var(--accent)'
                      : '2px solid var(--surface-3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedPacks.includes(pack.name)
                      ? 'rgba(var(--accent-rgb), 0.05)'
                      : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedPacks.includes(pack.name)}
                      onChange={() => togglePack(pack.name)}
                      style={{ marginTop: '2px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {pack.icon} {pack.name}
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                        {pack.description}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.375rem' }}>
                        {pack.count} skills
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
              <button
                className="btn-ghost"
                onClick={() => onComplete?.()}
                disabled={loading}
                style={{ width: 'auto' }}
              >
                Skip for now
              </button>
              <button
                className="btn-primary"
                onClick={handleImport}
                disabled={loading || selectedPacks.length === 0}
                style={{
                  width: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Download size={14} />
                {loading ? 'Importing…' : `Import ${selectedPacks.length} pack${selectedPacks.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
