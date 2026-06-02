'use client'

// All data operations go through our own Vercel API routes.
// Traffic path: browser → Vercel (/api/instructions) → Supabase  ✓
// supabase-browser is NOT imported here.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Check, X, Monitor, Folder } from 'lucide-react'

type Instruction = {
  id: string
  label: string
  instruction_text: string
  context_app: string | null
  context_folder: string | null
  is_active: boolean
  sort_order: number
}

type EditState = {
  label: string
  instruction_text: string
  context_app: string
  context_folder: string
}

export default function InstructionsPage() {
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [loading, setLoading]           = useState(true)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editState, setEditState]       = useState<EditState>({ label: '', instruction_text: '', context_app: '', context_folder: '' })
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/instructions', { credentials: 'include' })
    const data = await res.json()
    setInstructions(data ?? [])
    setLoading(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/instructions/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    setInstructions(prev => prev.map(i => i.id === id ? { ...i, is_active: !current } : i))
  }

  function startEdit(inst: Instruction) {
    setEditingId(inst.id)
    setEditState({
      label: inst.label,
      instruction_text: inst.instruction_text,
      context_app: inst.context_app ?? '',
      context_folder: inst.context_folder ?? '',
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const res = await fetch(`/api/instructions/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: editState.label.trim(),
        instruction_text: editState.instruction_text.trim(),
        context_app: editState.context_app.trim() || null,
        context_folder: editState.context_folder.trim() || null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    setEditingId(null)
    if (data?.id) setInstructions(prev => prev.map(i => i.id === id ? data : i))
  }

  async function deleteInstruction(id: string) {
    await fetch(`/api/instructions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    setInstructions(prev => prev.filter(i => i.id !== id))
    setDeletingId(null)
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '900px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
            Instructions
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Persistent rules that shape how the AI behaves — always active.
          </p>
        </div>
        <Link href="/dashboard/instructions/new" style={{ textDecoration: 'none' }}>
          <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={14} /> New instruction
          </button>
        </Link>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>
      ) : instructions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No instructions yet.</p>
          <Link href="/dashboard/instructions/new" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={14} /> Create your first instruction
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.875rem' }}>
          {instructions.map(inst => (
            <div key={inst.id} className="card" style={{ position: 'relative' }}>

              {editingId === inst.id ? (
                /* ── Edit mode ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div>
                    <label className="form-label">Label</label>
                    <input
                      className="form-input"
                      value={editState.label}
                      onChange={e => setEditState(s => ({ ...s, label: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Instruction</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={editState.instruction_text}
                      onChange={e => setEditState(s => ({ ...s, instruction_text: e.target.value }))}
                      style={{ resize: 'vertical' }}
                    />
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
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn-ghost" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => setEditingId(null)}>
                      <X size={13} /> Cancel
                    </button>
                    <button className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={() => saveEdit(inst.id)} disabled={saving}>
                      <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{inst.label}</span>
                      {inst.is_active
                        ? <span className="badge badge-accent">Active</span>
                        : <span className="badge badge-muted">Off</span>
                      }
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => toggleActive(inst.id, inst.is_active)}
                      style={{
                        width: '36px', height: '20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: inst.is_active ? 'var(--accent)' : 'var(--surface-3)',
                        cursor: 'pointer',
                        position: 'relative',
                        flexShrink: 0,
                        transition: 'background 0.2s',
                      }}
                    >
                      <span style={{
                        position: 'absolute',
                        top: '3px',
                        left: inst.is_active ? '18px' : '3px',
                        width: '14px', height: '14px',
                        borderRadius: '50%',
                        background: inst.is_active ? '#070709' : 'var(--text-muted)',
                        transition: 'left 0.2s',
                      }} />
                    </button>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '0.875rem' }}>
                    {inst.instruction_text}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {inst.context_app && (
                        <span className="badge badge-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Monitor size={10} /> {inst.context_app}
                        </span>
                      )}
                      {inst.context_folder && (
                        <span className="badge badge-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Folder size={10} /> {inst.context_folder}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        onClick={() => startEdit(inst)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      {deletingId === inst.id ? (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--error)' }}>Delete?</span>
                          <button onClick={() => deleteInstruction(inst.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                            <Check size={14} />
                          </button>
                          <button onClick={() => setDeletingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(inst.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                          title="Delete"
                        >
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
