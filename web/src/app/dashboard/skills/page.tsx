'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Check, X, Monitor, Folder, AlertTriangle } from 'lucide-react'

type Skill = {
  id: string
  name: string
  description: string | null
  prompt: string
  context_app: string | null
  context_folder: string | null
  is_destructive: boolean
  is_active: boolean
  sort_order: number
}

type EditState = {
  name: string
  description: string
  prompt: string
  context_app: string
  context_folder: string
  is_destructive: boolean
}

export default function SkillsPage() {
  const [skills, setSkills]         = useState<Skill[]>([])
  const [loading, setLoading]       = useState(true)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editState, setEditState]   = useState<EditState>({ name: '', description: '', prompt: '', context_app: '', context_folder: '', is_destructive: false })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data } = await supabase.from('skills').select('*').order('sort_order', { ascending: true })
    setSkills(data ?? [])
    setLoading(false)
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('skills').update({ is_active: !current }).eq('id', id)
    setSkills(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  function startEdit(skill: Skill) {
    setEditingId(skill.id)
    setEditState({
      name: skill.name,
      description: skill.description ?? '',
      prompt: skill.prompt,
      context_app: skill.context_app ?? '',
      context_folder: skill.context_folder ?? '',
      is_destructive: skill.is_destructive,
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('skills')
      .update({
        name: editState.name.trim(),
        description: editState.description.trim() || null,
        prompt: editState.prompt.trim(),
        context_app: editState.context_app.trim() || null,
        context_folder: editState.context_folder.trim() || null,
        is_destructive: editState.is_destructive,
      })
      .eq('id', id)
      .select()
      .single()
    setSaving(false)
    setEditingId(null)
    if (data) setSkills(prev => prev.map(s => s.id === id ? data : s))
  }

  async function deleteSkill(id: string) {
    const supabase = createClient()
    await supabase.from('skills').delete().eq('id', id)
    setSkills(prev => prev.filter(s => s.id !== id))
    setDeletingId(null)
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '900px' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
            Skills
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Named actions that appear in your command palette — triggered on demand.
          </p>
        </div>
        <Link href="/dashboard/skills/new" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={14} /> New skill
          </button>
        </Link>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>
      ) : skills.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No skills yet.</p>
          <Link href="/dashboard/skills/new" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={14} /> Create your first skill
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          {skills.map(skill => (
            <div key={skill.id} className="card">

              {editingId === skill.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label">Name</label>
                      <input className="form-input" value={editState.name} onChange={e => setEditState(s => ({ ...s, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Description</label>
                      <input className="form-input" value={editState.description} onChange={e => setEditState(s => ({ ...s, description: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Prompt</label>
                    <textarea className="form-input" rows={3} value={editState.prompt} onChange={e => setEditState(s => ({ ...s, prompt: e.target.value }))} style={{ resize: 'vertical' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label">Only when app</label>
                      <input className="form-input" placeholder="e.g. Microsoft Excel" value={editState.context_app} onChange={e => setEditState(s => ({ ...s, context_app: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Only in folder</label>
                      <input className="form-input" placeholder="e.g. C:/Work/Invoices" value={editState.context_folder} onChange={e => setEditState(s => ({ ...s, context_folder: e.target.value }))} />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={editState.is_destructive} onChange={e => setEditState(s => ({ ...s, is_destructive: e.target.checked }))} />
                    Requires confirmation before executing
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn-ghost" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => setEditingId(null)}>
                      <X size={13} /> Cancel
                    </button>
                    <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => saveEdit(skill.id)} disabled={saving}>
                      <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{skill.name}</span>
                      {skill.is_active ? <span className="badge badge-accent">Active</span> : <span className="badge badge-muted">Off</span>}
                      {skill.is_destructive && (
                        <span className="badge" style={{ background: 'rgba(255,82,82,0.08)', color: 'var(--error)', border: '1px solid rgba(255,82,82,0.2)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertTriangle size={9} /> Confirmation required
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => toggleActive(skill.id, skill.is_active)}
                      style={{ width: '36px', height: '20px', borderRadius: '10px', border: 'none', background: skill.is_active ? 'var(--accent)' : 'var(--surface-3)', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}
                    >
                      <span style={{ position: 'absolute', top: '3px', left: skill.is_active ? '18px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: skill.is_active ? '#070709' : 'var(--text-muted)', transition: 'left 0.2s' }} />
                    </button>
                  </div>

                  {skill.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{skill.description}</p>
                  )}

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace', background: 'var(--surface-2)', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {skill.prompt}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {skill.context_app && <span className="badge badge-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Monitor size={10} /> {skill.context_app}</span>}
                      {skill.context_folder && <span className="badge badge-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Folder size={10} /> {skill.context_folder}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => startEdit(skill)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                        <Pencil size={14} />
                      </button>
                      {deletingId === skill.id ? (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>Delete?</span>
                          <button onClick={() => deleteSkill(skill.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}><Check size={14} /></button>
                          <button onClick={() => setDeletingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(skill.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
