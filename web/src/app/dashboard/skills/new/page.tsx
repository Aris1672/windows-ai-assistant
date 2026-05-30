'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewSkillPage() {
  const router = useRouter()
  const [name, setName]                 = useState('')
  const [description, setDescription]   = useState('')
  const [prompt, setPrompt]             = useState('')
  const [contextApp, setContextApp]     = useState('')
  const [contextFolder, setContextFolder] = useState('')
  const [isDestructive, setIsDestructive] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) { setError('Name is required.'); return }
    if (!prompt.trim()) { setError('Prompt is required.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('skills').insert({
      user_id: user!.id,
      name: name.trim(),
      description: description.trim() || null,
      prompt: prompt.trim(),
      context_app: contextApp.trim() || null,
      context_folder: contextFolder.trim() || null,
      is_destructive: isDestructive,
      is_active: true,
      sort_order: 0,
    })

    setLoading(false)
    if (insertError) { setError(insertError.message); return }
    router.push('/dashboard/skills')
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '640px' }}>

      <Link href="/dashboard/skills" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '1.75rem' }}>
        <ArrowLeft size={14} /> Skills
      </Link>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
        New skill
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Skills appear in your command palette and are triggered on demand.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {error && <div className="error-banner">{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="e.g. Prepare meeting summary" value={name} onChange={e => setName(e.target.value)} disabled={loading} />
              <p style={{ marginTop: '0.375rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Shown in the command palette.</p>
            </div>
            <div>
              <label className="form-label">Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" placeholder="e.g. Summarizes the selected text" value={description} onChange={e => setDescription(e.target.value)} disabled={loading} />
              <p style={{ marginTop: '0.375rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Shown below the skill name.</p>
            </div>
          </div>

          <div>
            <label className="form-label">Prompt</label>
            <textarea
              className="form-input"
              placeholder={'e.g. Summarize the following text into 3 concise bullet points:\n\n{{selected_text}}'}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
              disabled={loading}
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <p style={{ marginTop: '0.375rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Use <code style={{ background: 'var(--surface-3)', padding: '0.1rem 0.35rem', borderRadius: '3px', fontSize: '0.75rem' }}>{'{{selected_text}}'}</code> to insert whatever the user has highlighted.
            </p>
          </div>

          <hr className="divider" />

          <div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Context conditions <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label className="form-label">Only when app is active</label>
                <input className="form-input" placeholder="e.g. Microsoft Excel" value={contextApp} onChange={e => setContextApp(e.target.value)} disabled={loading} />
              </div>
              <div>
                <label className="form-label">Only in this folder</label>
                <input className="form-input" placeholder="e.g. C:/Work/Invoices" value={contextFolder} onChange={e => setContextFolder(e.target.value)} disabled={loading} />
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Leave blank to always surface this skill.</p>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={isDestructive} onChange={e => setIsDestructive(e.target.checked)} disabled={loading} />
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>Requires confirmation before executing</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Enable for skills that write, move, or delete files.</div>
              </div>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
            <Link href="/dashboard/skills" style={{ textDecoration: 'none' }}>
              <button type="button" className="btn-ghost" style={{ width: 'auto' }}>Cancel</button>
            </Link>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: 'auto' }}>
              {loading ? 'Saving…' : 'Create skill'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
