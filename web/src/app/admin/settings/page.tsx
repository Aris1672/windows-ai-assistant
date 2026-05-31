import { Settings } from 'lucide-react'

export default function AdminSettingsPage() {
  return (
    <div style={{ padding: '2.5rem', maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Global app configuration.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', textAlign: 'center', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Settings size={20} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.375rem', fontWeight: 500 }}>
            Settings coming in Phase 4
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Global feature flags, model selection, rate limits, and billing config will live here.
          </p>
        </div>
      </div>
    </div>
  )
}
