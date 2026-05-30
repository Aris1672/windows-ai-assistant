'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewInstructionPage() {
  const router = useRouter()
  const [label, setLabel]                   = useState('')
  const [instructionText, setInstructionText] = useState('')
  const [contextApp, setContextApp]         = useState('')
  const [contextFolder, setContextFolder]   = useState('')
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!label.trim()) { setError('Label is required.'); return }
    if (!instructionText.trim()) { setError('Instruction text is required.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('instructions').insert({
      user_id: user!.id,
      label: label.trim(),
      instruction_text: instructionText.trim(),
      context_app: contextApp.trim() || null,
      context_folder: contextFolder.trim() || null,
      is_active: true,
      sort_order: 0,
    })

    setLoading(false)
    if (insertError) { setError(insertError.message); return }
    router.push('/dashboard/instructions')
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '640px' }}>

      {/* Back */}
      <Link href="/dashboard/instructions" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '1.75rem' }}>
        <ArrowLeft size={14} /> Instructions
      </Link>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
        New instruction
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        This rule will always be active unless scoped to a specific app or folder.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {error && <div className="error-banner">{error}</div>}

          <div>
            <label className="form-label">Label</label>
            <input
              className="form-input"
              placeholder="e.g. Formal tone"
              value={label}
              onChange={e => setLabel(e.target.value)}
              disabled={loading}
            />
            <p style={{ marginTop: '0.375rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Short name shown in your dashboard.
            </p>
          </div>

          <div>
            <label className="form-label">Instruction</label>
            <textarea
              className="form-input"
              placeholder="e.g. Always respond in a formal, professional tone. Avoid casual language."
              value={instructionText}
              onChange={e => setInstructionText(e.target.value)}
              rows={4}
              disabled={loading}
              style={{ resize: 'vertical' }}
            />
            <p style={{ marginTop: '0.375rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              This text is sent to the AI with every request.
            </p>
          </div>

          <hr className="divider" />

          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Context conditions <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label">Only when app is active</label>
                <input
                  className="form-input"
                  placeholder="e.g. Microsoft Excel"
                  value={contextApp}
                  onChange={e => setContextApp(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="form-label">Only in this folder</label>
                <input
                  className="form-input"
                  placeholder="e.g. C:/Work/Invoices"
                  value={contextFolder}
                  onChange={e => setContextFolder(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Leave blank to apply everywhere.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
            <Link href="/dashboard/instructions" style={{ textDecoration: 'none' }}>
              <button type="button" className="btn-ghost" style={{ width: 'auto' }}>Cancel</button>
            </Link>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: 'auto' }}>
              {loading ? 'Saving…' : 'Create instruction'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
