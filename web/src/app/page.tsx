import Link from 'next/link'

// ── Mock palette items shown in the hero illustration ─────────────────────────
const PALETTE_ITEMS = [
  { label: 'Summarize this',        icon: '◈', active: true  },
  { label: 'Rewrite professionally', icon: '✦', active: false },
  { label: 'Explain this error',    icon: '◎', active: false },
  { label: 'Translate to Dutch',    icon: '◇', active: false },
  { label: 'Prepare meeting notes', icon: '▷', active: false },
]

const FEATURES = [
  {
    eyebrow: 'Always there',
    title: 'One keystroke from anywhere',
    body: 'Hit Ctrl + Space from any app, any window, any moment. No switching tabs. No opening a chatbot. Your AI co-worker is already watching.',
    icon: '⌨',
  },
  {
    eyebrow: 'Context-aware',
    title: 'It already knows what you\'re working on',
    body: 'Active app, open folder, selected text — all captured the moment you press the shortcut. No describing the situation. It sees what you see.',
    icon: '◎',
  },
  {
    eyebrow: 'Personalised',
    title: 'Compounds with every instruction',
    body: 'Set rules once — "keep it brief", "use Dutch", "always format as bullet points" — and they\'re silently applied forever. Skills surface automatically based on context.',
    icon: '✦',
  },
]

const STEPS = [
  { n: '01', title: 'Press Ctrl + Space', body: 'From anywhere on Windows. The palette appears instantly.' },
  { n: '02', title: 'See what\'s relevant', body: 'Skills for your current app and folder surface automatically.' },
  { n: '03', title: 'Act', body: 'Type a message, pick a skill, or just ask. Read-only actions fire immediately. Destructive ones ask first.' },
]

export default function LandingPage() {
  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        .hero-fade   { animation: fadeUp 0.7s ease both; }
        .hero-fade-1 { animation-delay: 0.05s; }
        .hero-fade-2 { animation-delay: 0.15s; }
        .hero-fade-3 { animation-delay: 0.28s; }
        .hero-fade-4 { animation-delay: 0.42s; }
        .palette-float { animation: float 4s ease-in-out infinite; }
        .cursor { animation: blink 1.1s step-start infinite; }
        .feature-card:hover { border-color: var(--accent-border) !important; }
        .feature-card:hover .feature-icon { color: var(--accent) !important; }
        .cta-btn:hover { background: var(--accent-hover) !important; transform: translateY(-1px); }
        .cta-btn:active { transform: translateY(0); }
        .ghost-btn:hover { border-color: var(--accent-border) !important; color: var(--text-primary) !important; }
        .step-num { font-variant-numeric: tabular-nums; }
        .kbd {
          display: inline-block;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-bottom-width: 2px;
          border-radius: 5px;
          padding: 0.1rem 0.45rem;
          font-size: 0.8em;
          font-family: monospace;
          color: var(--text-secondary);
          line-height: 1.5;
        }
      `}</style>

      <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'var(--font-body), system-ui, sans-serif' }}>

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(16px)',
          background: 'rgba(7,7,9,0.8)',
          padding: '0 2rem',
          height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span className="wordmark">co<span>·</span>pilot</span>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost ghost-btn" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                Sign in
              </button>
            </Link>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-primary cta-btn" style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem', transition: 'background 0.15s, transform 0.15s' }}>
                Get started
              </button>
            </Link>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-grid" style={{ paddingTop: '140px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>

          {/* Glow */}
          <div style={{
            position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)',
            width: '600px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(15,255,212,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>

            {/* Left: copy */}
            <div>
              <div className="hero-fade hero-fade-1" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                borderRadius: '100px', padding: '0.3rem 0.875rem',
                fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--accent)', marginBottom: '1.75rem',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                Windows · Beta
              </div>

              <h1 className="hero-fade hero-fade-2" style={{
                fontFamily: 'var(--font-display), system-ui, sans-serif',
                fontSize: 'clamp(2.4rem, 4vw, 3.2rem)',
                fontWeight: 700,
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem',
                color: 'var(--text-primary)',
              }}>
                Your co-worker<br />
                lives in{' '}
                <span style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                  Ctrl + Space
                </span>
              </h1>

              <p className="hero-fade hero-fade-3" style={{
                fontSize: '1.05rem', lineHeight: 1.65,
                color: 'var(--text-secondary)',
                maxWidth: '440px',
                marginBottom: '2.25rem',
              }}>
                A contextual AI command palette for Windows.
                Hit the shortcut from any app — it sees what you&rsquo;re doing,
                surfaces the right actions, and gets it done.
                Not a chatbot. A co-worker.
              </p>

              <div className="hero-fade hero-fade-4" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary cta-btn" style={{ width: 'auto', padding: '0.75rem 1.75rem', fontSize: '0.925rem', transition: 'background 0.15s, transform 0.15s' }}>
                    Download for Windows
                  </button>
                </Link>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Free during beta</span>
              </div>
            </div>

            {/* Right: palette illustration */}
            <div style={{ display: 'flex', justifyContent: 'center' }} className="palette-float">
              <div style={{
                width: '100%', maxWidth: '380px',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(15,255,212,0.04)',
              }}>

                {/* Window chrome */}
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3A3A44' }} />
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3A3A44' }} />
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3A3A44' }} />
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Microsoft Excel · Q3 Report.xlsx
                  </div>
                </div>

                {/* Search input */}
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>⌘</span>
                  <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    What do you need?<span className="cursor" style={{ color: 'var(--accent)' }}>▌</span>
                  </span>
                  <span className="kbd">Esc</span>
                </div>

                {/* Context chip */}
                <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.15rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ color: 'var(--accent)', fontSize: '0.6rem' }}>◎</span> Excel
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.15rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.6rem' }}>📁</span> /Work/Finance
                  </span>
                </div>

                {/* Skill list */}
                <div style={{ padding: '0.25rem 0.5rem 0.75rem' }}>
                  {PALETTE_ITEMS.map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.55rem 0.625rem',
                      borderRadius: '8px',
                      background: item.active ? 'var(--accent-dim)' : 'transparent',
                      border: `1px solid ${item.active ? 'var(--accent-border)' : 'transparent'}`,
                      marginBottom: '0.125rem',
                      transition: 'background 0.12s',
                    }}>
                      <span style={{ color: item.active ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.8rem', width: '16px', textAlign: 'center' }}>
                        {item.icon}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: item.active ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: item.active ? 500 : 400 }}>
                        {item.label}
                      </span>
                      {item.active && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)' }}>↵</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ── Divider line ─────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '100px 2rem' }}>

          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.875rem' }}>
              Why it&rsquo;s different
            </p>
            <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
              Built for flow, not friction
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '2rem',
                transition: 'border-color 0.2s',
              }}>
                <div className="feature-icon" style={{ fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--text-muted)', transition: 'color 0.2s' }}>
                  {f.icon}
                </div>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {f.eyebrow}
                </p>
                <h3 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.875rem', lineHeight: 1.25 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comparison table ─────────────────────────────────────────────── */}
        <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
                Not a chatbot. Not a copilot. Something better.
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

              {/* Typical AI chatbot */}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Typical AI chatbot
                </p>
                {[
                  'You go to it',
                  'Generic responses',
                  'You describe everything',
                  'Talks, doesn\'t act',
                  'Same for everyone',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0', borderBottom: i < 4 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span style={{ color: 'var(--error)', fontSize: '0.75rem' }}>✕</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* This product */}
              <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: '12px', padding: '1.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>
                  This
                </p>
                {[
                  'Always one keystroke away',
                  'Context-aware actions',
                  'It already knows',
                  'Reads AND executes',
                  'Personalised to you',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0', borderBottom: i < 4 ? '1px solid var(--accent-border)' : 'none' }}>
                    <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>✓</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 2rem' }}>

          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.875rem' }}>
              How it works
            </p>
            <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', lineHeight: 1.15 }}>
              Three seconds from thought to done
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0', position: 'relative' }}>

            {/* Connector line */}
            <div style={{ position: 'absolute', top: '28px', left: 'calc(16.6% + 1rem)', right: 'calc(16.6% + 1rem)', height: '1px', background: 'linear-gradient(90deg, var(--accent-border), var(--accent-border))', zIndex: 0 }} />

            {STEPS.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 1.5rem', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontFamily: 'var(--font-display), system-ui, sans-serif',
                  fontSize: '0.85rem', fontWeight: 700,
                  color: 'var(--accent)',
                  letterSpacing: '-0.01em',
                }}>
                  {step.n}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--text-primary)', marginBottom: '0.625rem' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '100px 2rem', textAlign: 'center' }}>

            {/* Accent glow */}
            <div style={{
              width: '160px', height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
              margin: '0 auto 3rem',
            }} />

            <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '1rem' }}>
              Ready to work differently?
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>
              Free during beta. No credit card. Works on Windows 10 and 11.
            </p>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-primary cta-btn" style={{ width: 'auto', padding: '0.875rem 2.5rem', fontSize: '1rem', transition: 'background 0.15s, transform 0.15s' }}>
                Download for Windows — it&rsquo;s free
              </button>
            </Link>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in →</Link>
            </p>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto' }}>
          <span className="wordmark" style={{ fontSize: '1rem' }}>co<span>·</span>pilot</span>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Windows only · Beta · Built with Claude
          </p>
        </footer>

      </div>
    </>
  )
}
