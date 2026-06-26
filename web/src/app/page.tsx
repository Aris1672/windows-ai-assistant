'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ── Content ───────────────────────────────────────────────────────────────────
const CONTENT = {
  en: {
    badge:      'Windows',
    headline1:  'Your co-worker',
    headline2:  'lives in',
    sub:        "A contextual AI command palette for Windows. Hit the shortcut from any app — it sees what you're doing, surfaces the right actions, and gets it done. Not a chatbot. A co-worker.",
    download:   'Download for Windows',
    freeBeta:   '7-day free trial',
    signIn:     'Sign in',
    getStarted: 'Get started',

    whyEyebrow: "Why it's different",
    whyTitle:   'Built for flow, not friction',

    features: [
      {
        eyebrow: 'Always there',
        title:   'One keystroke from anywhere',
        body:    'Hit Ctrl + Space from any app, any window, any moment. No switching tabs. No opening a chatbot. Your AI co-worker is already watching.',
        icon:    '⌨',
      },
      {
        eyebrow: 'Context-aware',
        title:   "It already knows what you're working on",
        body:    'Active app, open folder, selected text, calendar — all captured the moment you press the shortcut. It even reads your files and sees your screen. No describing the situation.',
        icon:    '◎',
      },
      {
        eyebrow: 'Personalised',
        title:   'Compounds with every instruction',
        body:    "Set rules once — \"keep it brief\", \"use Dutch\", \"always format as bullet points\" — and they're silently applied forever. Skills surface automatically based on what you're doing.",
        icon:    '✦',
      },
      {
        eyebrow: 'Gets smarter',
        title:   'Learns your workflows over time',
        body:    'As you work, it detects recurring multi-step patterns in your actions and proactively suggests turning them into Skills — so the things you do every day take one click instead of ten.',
        icon:    '◈',
      },
      {
        eyebrow: 'Proactive',
        title:   'Runs on your schedule, not just on demand',
        body:    'Schedule any Skill to fire automatically — daily briefings, weekly summaries, end-of-day cleanup. It delivers results as a Windows notification while you focus on other things.',
        icon:    '▷',
      },
      {
        eyebrow: 'Actually acts',
        title:   'Reads, writes, and works alongside you',
        body:    "Attach a file, read a document, pin a response as a floating note, or have it write directly into your app. Read-only actions fire instantly. Destructive ones ask first.",
        icon:    '◇',
      },
    ],

    vsTitle:    'Not a chatbot. Not a copilot. Something better.',
    vsBad:      [
      'You go to it',
      'Generic responses',
      'You describe everything',
      'Talks, doesn\'t act',
      'Same for everyone',
      'Waits for you',
    ],
    vsGood:     [
      'Always one keystroke away',
      'Context-aware actions',
      'It already knows',
      'Reads AND executes',
      'Personalised — and learns',
      'Runs on a schedule',
    ],
    vsLabelBad: 'Typical AI chatbot',
    vsLabelGood:'Assistant24',

    differentEyebrow: 'Why it feels different',
    differentTitle:   'Why Assistant24 feels different',
    differentTable: [
      {
        feature:     'Getting started',
        traditional: 'Open a new tab or window',
        you:         'One keystroke from any app',
      },
      {
        feature:     'Context',
        traditional: 'You explain the situation every time',
        you:         'It already knows your app, file, and calendar',
      },
      {
        feature:     'Working with files',
        traditional: 'Copy and paste content manually',
        you:         'Reads files, attaches documents, works with your data',
      },
      {
        feature:     'Output',
        traditional: 'Returns text you copy somewhere else',
        you:         'Writes into your app, pins a note, copies to clipboard',
      },
      {
        feature:     'Personalisation',
        traditional: 'Same for everyone',
        you:         'Your instructions and Skills, always active',
      },
      {
        feature:     'Memory',
        traditional: 'Forgets after each session',
        you:         'Remembers your workflows and builds on them',
      },
      {
        feature:     'Initiative',
        traditional: 'Waits to be asked',
        you:         'Detects patterns, suggests Skills, runs on schedule',
      },
    ],

    howEyebrow: 'How it works',
    howTitle:   'Three seconds from thought to done',
    steps: [
      { n: '01', title: 'Press Ctrl + Space',    body: 'From anywhere on Windows. The palette appears instantly with context already loaded.' },
      { n: '02', title: "See what's relevant",   body: 'Skills for your current app, folder, and calendar surface automatically. Or attach a file and ask anything about it.' },
      { n: '03', title: 'Act',                   body: 'Type a message, pick a skill, or just ask. Read-only actions fire immediately. Destructive ones ask first.' },
    ],

    ctaTitle:    'Ready to work differently?',
    ctaSub:      '7-day free trial. No credit card. Works on Windows 10 and 11.',
    ctaBtn:      'Download for Windows — free trial',
    ctaSignIn:   'Already have an account?',
    ctaSignInLk: 'Sign in →',

    footerSub:  'Windows only · © 2025 - 2026 Assistant24. All rights reserved.',

    paletteContext: 'Microsoft Excel · Q3 Report.xlsx',
    paletteFolder:  '/Work/Finance',
    palettePlaceholder: 'What do you need?',
    paletteItems: [
      { label: 'Summarize this',         icon: '◈', active: true  },
      { label: 'Rewrite professionally', icon: '✦', active: false },
      { label: 'Explain this error',     icon: '◎', active: false },
      { label: 'Translate to Dutch',     icon: '◇', active: false },
      { label: 'Prepare meeting notes',  icon: '▷', active: false },
    ],

    // Hero "magic moment" demo
    demoExcelTitle:   'Q3 Report.xlsx',
    demoExcelHeaders: ['', 'Q2', 'Q3', 'Δ'],
    demoExcelRows: [
      ['Revenue',        '$1.42M', '$1.68M', '+18%'],
      ['Gross margin',   '33%',    '34%',    '+1pt'],
      ['Headcount',      '58',     '65',     '+12%'],
      ['New customers',  '24',     '31',     '+29%'],
    ],
    demoQuery:        'Summarize this report',
    demoReading:      'Reading Q3 Report.xlsx…',
    demoResultTitle:  'Summary',
    demoBullets: [
      'Revenue up 18% QoQ, led by EU expansion',
      'Gross margin holding steady at 34%',
      'Headcount grew 12%, mostly engineering',
    ],
    demoAction: 'Inserted into Excel',
  },

  ru: {
    badge:      'Windows',
    headline1:  'Ваш ИИ-помощник',
    headline2:  'живёт в',
    sub:        'Контекстная AI-палитра команд для Windows. Нажмите горячую клавишу из любого приложения — она видит, что вы делаете, предлагает нужные действия и выполняет их. Не чат-бот. Умный помощник.',
    download:   'Скачать для Windows',
    freeBeta:   '7 дней бесплатно',
    signIn:     'Войти',
    getStarted: 'Начать',

    whyEyebrow: 'Чем отличается',
    whyTitle:   'Создан для потока, а не для трений',

    features: [
      {
        eyebrow: 'Всегда рядом',
        title:   'Один горячий клавиш из любого места',
        body:    'Нажмите Ctrl + Space из любого приложения, любого окна, в любой момент. Никаких переключений вкладок. Никаких чат-ботов. Ваш AI-помощник уже готов.',
        icon:    '⌨',
      },
      {
        eyebrow: 'Понимает контекст',
        title:   'Он уже знает, над чем вы работаете',
        body:    'Активное приложение, открытая папка, выделенный текст, календарь — всё захватывается в момент нажатия. Читает файлы и видит экран. Не нужно ничего объяснять.',
        icon:    '◎',
      },
      {
        eyebrow: 'Персонализирован',
        title:   'Умнеет с каждой инструкцией',
        body:    'Задайте правила один раз — «отвечай кратко», «используй русский», «форматируй списком» — и они применяются автоматически навсегда. Навыки появляются сами в нужном контексте.',
        icon:    '✦',
      },
      {
        eyebrow: 'Учится',
        title:   'Запоминает ваши рабочие процессы',
        body:    'По мере работы он обнаруживает повторяющиеся многошаговые паттерны и проактивно предлагает превратить их в Навыки — чтобы рутина занимала один клик вместо десяти.',
        icon:    '◈',
      },
      {
        eyebrow: 'Проактивен',
        title:   'Работает по расписанию, не только по запросу',
        body:    'Запланируйте любой Навык на автоматический запуск — утренняя сводка, еженедельный отчёт, уборка в конце дня. Результат приходит уведомлением Windows, пока вы занимаетесь другим.',
        icon:    '▷',
      },
      {
        eyebrow: 'Действует',
        title:   'Читает, пишет и работает рядом с вами',
        body:    'Прикрепите файл, прочитайте документ, закрепите ответ как плавающую заметку или пусть он сам вставит текст в приложение. Безопасные действия — мгновенно. Опасные — с подтверждением.',
        icon:    '◇',
      },
    ],

    vsTitle:    'Не чат-бот. Не копилот. Нечто лучшее.',
    vsBad:      [
      'Вы идёте к нему',
      'Общие ответы',
      'Вы всё описываете',
      'Говорит, но не делает',
      'Одинаков для всех',
      'Ждёт вас',
    ],
    vsGood:     [
      'Всегда в одном нажатии',
      'Контекстные действия',
      'Он уже знает',
      'Читает И выполняет',
      'Персонализирован — и учится',
      'Работает по расписанию',
    ],
    vsLabelBad: 'Обычный AI-чат',
    vsLabelGood:'Assistant24',

    differentEyebrow: 'Почему это другое',
    differentTitle:   'Почему Assistant24 ощущается иначе',
    differentTable: [
      {
        feature:     'Запуск',
        traditional: 'Открыть новую вкладку или окно',
        you:         'Одна горячая клавиша из любого приложения',
      },
      {
        feature:     'Контекст',
        traditional: 'Объясняете ситуацию каждый раз',
        you:         'Уже знает ваше приложение, файл и календарь',
      },
      {
        feature:     'Работа с файлами',
        traditional: 'Вручную копировать и вставлять содержимое',
        you:         'Читает файлы, принимает документы, работает с вашими данными',
      },
      {
        feature:     'Результат',
        traditional: 'Возвращает текст, который нужно куда-то скопировать',
        you:         'Вставляет в приложение, закрепляет заметку, копирует в буфер',
      },
      {
        feature:     'Персонализация',
        traditional: 'Одинаков для всех',
        you:         'Ваши инструкции и Навыки, всегда активны',
      },
      {
        feature:     'Память',
        traditional: 'Забывает после каждой сессии',
        you:         'Запоминает рабочие процессы и развивается вместе с вами',
      },
      {
        feature:     'Инициатива',
        traditional: 'Ждёт запроса',
        you:         'Замечает паттерны, предлагает Навыки, работает по расписанию',
      },
    ],

    howEyebrow: 'Как это работает',
    howTitle:   'От мысли до результата — три секунды',
    steps: [
      { n: '01', title: 'Нажмите Ctrl + Space',   body: 'Из любого места в Windows. Палитра появляется мгновенно — контекст уже загружен.' },
      { n: '02', title: 'Видите нужное',           body: 'Навыки для текущего приложения, папки и календаря появляются автоматически. Или прикрепите файл и спросите о чём угодно.' },
      { n: '03', title: 'Действуйте',              body: 'Напишите сообщение, выберите навык или просто спросите. Безопасные действия — сразу. Деструктивные — с подтверждением.' },
    ],

    ctaTitle:    'Готовы работать иначе?',
    ctaSub:      '7 дней бесплатно. Без карты. Работает на Windows 10 и 11.',
    ctaBtn:      'Скачать для Windows — 7 дней бесплатно',
    ctaSignIn:   'Уже есть аккаунт?',
    ctaSignInLk: 'Войти →',

    footerSub:  'Только для Windows · © 2025 - 2026 Assistant24. Все права защищены.',

    paletteContext: 'Microsoft Excel · Отчёт Q3.xlsx',
    paletteFolder:  '/Работа/Финансы',
    palettePlaceholder: 'Что вам нужно?',
    paletteItems: [
      { label: 'Суммировать',               icon: '◈', active: true  },
      { label: 'Переписать профессионально', icon: '✦', active: false },
      { label: 'Объяснить эту ошибку',      icon: '◎', active: false },
      { label: 'Перевести на русский',       icon: '◇', active: false },
      { label: 'Подготовить протокол',       icon: '▷', active: false },
    ],

    // Hero "magic moment" demo
    demoExcelTitle:   'Отчёт Q3.xlsx',
    demoExcelHeaders: ['', 'Q2', 'Q3', 'Δ'],
    demoExcelRows: [
      ['Выручка',         '$1.42М', '$1.68М', '+18%'],
      ['Рентабельность',  '33%',    '34%',    '+1пт'],
      ['Сотрудники',      '58',     '65',     '+12%'],
      ['Новые клиенты',   '24',     '31',     '+29%'],
    ],
    demoQuery:        'Суммировать этот отчёт',
    demoReading:      'Читаю Отчёт Q3.xlsx…',
    demoResultTitle:  'Сводка',
    demoBullets: [
      'Выручка выросла на 18% — рост за счёт ЕС',
      'Рентабельность стабильна на уровне 34%',
      'Штат вырос на 12%, в основном инженеры',
    ],
    demoAction: 'Вставлено в Excel',
  },
} as const

type Lang = 'en' | 'ru'

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en')
  const t = CONTENT[lang]

  // ── Hero demo animation
  // Steps:
  //  0 – idle spreadsheet
  //  1 – Ctrl+Space hotkey toast
  //  2 – typing query 1
  //  3 – AI thinking (dots)
  //  4 – AI asks clarifying questions
  //  5 – user types answers (query 2)
  //  6 – AI thinking again
  //  7 – email client overlay
  const QUERY1 = 'Summarise these sales numbers into a short email report'
  const QUERY2_LINES = ['Sales - June 2026', 'sales@sales.com', 'English', 'highlights']
  const QUERY2 = QUERY2_LINES.join('\n')
  const CHAR_DELAY_1 = 38
  const CHAR_DELAY_2 = 55

  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState(0)

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>
    if (step === 0) id = setTimeout(() => setStep(1), 2200)
    else if (step === 1) id = setTimeout(() => { setStep(2); setTyped(0) }, 700)
    else if (step === 3) id = setTimeout(() => setStep(4), 1100)
    else if (step === 4) id = setTimeout(() => { setStep(5); setTyped(0) }, 1900)
    else if (step === 6) id = setTimeout(() => setStep(7), 1200)
    else if (step === 7) id = setTimeout(() => { setStep(0); setTyped(0) }, 3800)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    if (step !== 2 && step !== 5) return
    const query = step === 2 ? QUERY1 : QUERY2
    const delay = step === 2 ? CHAR_DELAY_1 : CHAR_DELAY_2
    setTyped(0)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(i)
      if (i >= query.length) {
        clearInterval(id)
        setTimeout(() => setStep(step === 2 ? 3 : 6), 450)
      }
    }, delay)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
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
        .feature-card { transition: border-color 0.2s; }
        .feature-card:hover { border-color: var(--accent-border) !important; }
        .feature-card:hover .feature-icon { color: var(--accent) !important; }
        .cta-btn { transition: background 0.15s, transform 0.15s; }
        .cta-btn:hover { background: var(--accent-hover) !important; transform: translateY(-1px); }
        .cta-btn:active { transform: translateY(0); }
        .ghost-btn:hover { border-color: var(--accent-border) !important; color: var(--text-primary) !important; }
        .lang-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer; transition: all 0.15s; font-family: var(--font-body), system-ui, sans-serif; }
        .lang-btn.active { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
        .lang-btn:not(.active):hover { border-color: var(--border); color: var(--text-secondary); }
        .kbd { display: inline-block; background: var(--surface-3); border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 5px; padding: 0.1rem 0.45rem; font-size: 0.8em; font-family: monospace; color: var(--text-secondary); line-height: 1.5; }
        .diff-row-you { color: var(--accent); font-weight: 500; }
        .diff-row-traditional { color: var(--text-secondary); }
        @keyframes keyPulse {
          0%   { transform: scale(0.85); opacity: 0; }
          35%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40%            { opacity: 1;    transform: scale(1); }
        }
        .demo-key { animation: keyPulse 0.4s ease both; }
        .demo-dots { display: inline-flex; gap: 4px; }
        .demo-dots span { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); display: inline-block; animation: dotPulse 1.1s ease-in-out infinite; }
        .demo-dots span:nth-child(2) { animation-delay: 0.15s; }
        .demo-dots span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes emailSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: none; }
        }
        .demo-bubble { animation: bubbleIn 0.3s ease both; }
        .demo-ai-card { animation: fadeUp 0.35s ease both; }
        .demo-email { animation: emailSlideIn 0.45s cubic-bezier(0.4,0,0.2,1) both; }
        .demo-skill-btn {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 2px 7px;
          font-size: 0.65rem;
          color: var(--text-secondary);
          white-space: nowrap;
          font-family: var(--font-body), system-ui, sans-serif;
        }
        .demo-skill-btn.active-skill {
          background: var(--accent-dim);
          border-color: var(--accent-border);
          color: var(--accent);
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
          <a href="https://assistant24.tech/index.html" style={{ textDecoration: 'none' }}>
            <span className="wordmark">
  ASSISTANT <span>24</span>
</span>
          </a>

          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            {/* Language switcher */}
            <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.5rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.2rem' }}>
              <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => setLang('en')}>EN</button>
              <button className={`lang-btn${lang === 'ru' ? ' active' : ''}`} onClick={() => setLang('ru')}>RU</button>
            </div>

            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost ghost-btn" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                {t.signIn}
              </button>
            </Link>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-primary cta-btn" style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                {t.getStarted}
              </button>
            </Link>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-grid" style={{ paddingTop: '140px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(15,255,212,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>

            {/* Left: copy */}
            <div>
              <div className="hero-fade hero-fade-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: '100px', padding: '0.3rem 0.875rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1.75rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                {t.badge}
              </div>

              <h1 className="hero-fade hero-fade-2" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                {t.headline1}<br />
                {t.headline2}{' '}
                <span style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}>Ctrl + Space</span>
              </h1>

              <p className="hero-fade hero-fade-3" style={{ fontSize: '1.05rem', lineHeight: 1.65, color: 'var(--text-secondary)', maxWidth: '440px', marginBottom: '2.25rem' }}>
                {t.sub}
              </p>

              <div className="hero-fade hero-fade-4" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                  <button className="btn-primary cta-btn" style={{ width: 'auto', padding: '0.75rem 1.75rem', fontSize: '0.925rem' }}>
                    {t.download}
                  </button>
                </Link>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.freeBeta}</span>
              </div>
            </div>

            {/* Right: realistic palette demo */}
            <div style={{ display: 'flex', justifyContent: 'center' }} className="palette-float">
              <div style={{ position: 'relative', width: '100%', maxWidth: '480px', height: '480px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>

                {/* ── Spreadsheet background ── */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: '#f0f0eb',
                  filter: step >= 2 ? 'blur(1.5px) brightness(0.5)' : 'none',
                  transform: step >= 2 ? 'scale(0.98)' : 'scale(1)',
                  transition: 'filter 0.5s ease, transform 0.5s ease',
                  fontFamily: 'system-ui, sans-serif',
                }}>
                  {/* Title bar */}
                  <div style={{ background: '#e8e8e4', borderBottom: '1px solid #bbb', padding: '3px 8px', fontSize: '10px', color: '#333', display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: 1, textAlign: 'center' }}>Электронная таблица OpenDocument.ods — OpenOffice Calc</span>
                    <span style={{ color: '#888' }}>— □ ✕</span>
                  </div>
                  {/* Menu bar */}
                  <div style={{ background: '#f5f5f0', borderBottom: '1px solid #ccc', padding: '2px 8px', fontSize: '10px', color: '#333', display: 'flex', gap: '10px' }}>
                    {['Файл','Правка','Вид','Вставка','Формат','Сервис','Данные','Окно'].map(m => <span key={m}>{m}</span>)}
                  </div>
                  {/* Column headers */}
                  <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
                    <div style={{ width: '32px', background: '#e8e8e4', borderRight: '1px solid #ccc', height: '16px' }} />
                    {['B','C','D','E','F','G','H'].map((c, i) => (
                      <div key={c} style={{ flex: 1, background: '#e8e8e4', borderRight: '1px solid #ccc', textAlign: 'center', fontSize: '9px', color: '#333', height: '16px', lineHeight: '16px' }}>{c}</div>
                    ))}
                  </div>
                  {/* Data rows */}
                  {[
                    ['', 'Region', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'TOTAL'],
                    ['', 'North', '$4,200', '$3,800', '$5,100', '$4,600', '$6,200', '$23,900'],
                    ['', 'South', '$3,100', '$4,400', '$3,900', '$5,200', '$4,800', '$21,400'],
                    ['', 'East',  '$5,500', '$5,100', '$4,700', '$5,800', '$7,100', '$28,200'],
                    ['', 'West',  '$2,900', '$3,300', '$4,100', '$3,700', '$4,500', '$18,500'],
                    ['', 'TOTAL', '$15,700','$16,600','$17,800','$19,300','$22,600','$92,000'],
                  ].map((row, ri) => (
                    <div key={ri} style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                      <div style={{ width: '32px', background: '#e8e8e4', borderRight: '1px solid #ccc', textAlign: 'center', fontSize: '9px', color: '#555', lineHeight: '17px' }}>{ri + 2}</div>
                      {row.slice(1).map((cell, ci) => (
                        <div key={ci} style={{ flex: 1, height: '17px', borderRight: '1px solid #ddd', fontSize: '9px', padding: '0 3px', lineHeight: '17px', background: '#fff', color: '#222', fontWeight: (ri === 0 || ri === 5 || ci === 6) ? 700 : 400, textAlign: ci === 0 ? 'left' : 'right', whiteSpace: 'nowrap', overflow: 'hidden' }}>{cell}</div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* ── Hotkey toast ── */}
                {step === 1 && (
                  <div className="demo-key" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--surface-2)', border: '1px solid var(--accent-border)', borderRadius: '10px', padding: '0.6rem 1.2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 10 }}>
                    <span className="kbd" style={{ fontSize: '0.95rem', color: 'var(--accent)' }}>Ctrl + Space</span>
                  </div>
                )}

                {/* ── Palette panel (slides in from right, compact then grows) ── */}
                <div style={{
                  position: 'absolute', top: 28, right: 0, width: '85%',
                  background: '#1a1a1f',
                  borderLeft: '1px solid #2a2a35',
                  borderBottom: '1px solid #2a2a35',
                  borderBottomLeftRadius: '8px',
                  display: 'flex', flexDirection: 'column',
                  transform: step >= 2 ? 'translateX(0)' : 'translateX(100%)',
                  opacity: step >= 2 ? 1 : 0,
                  transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
                  zIndex: 4,
                  fontFamily: 'system-ui, sans-serif',
                  boxShadow: '-8px 8px 32px rgba(0,0,0,0.5)',
                }}>
                  {/* Header */}
                  <div style={{ padding: '5px 8px', borderBottom: '1px solid #2a2a35', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                    <span style={{ background: '#2a2a35', border: '1px solid #3a3a45', borderRadius: '5px', padding: '1px 6px', fontSize: '8px', fontWeight: 700, color: '#aaa', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>OPENOFFICE 4.1.16</span>
                    <span style={{ flex: 1, fontSize: '8px', color: '#555', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {step >= 3 ? '"Summarise these sales numbers…"' : ''}
                    </span>
                    <span style={{ background: '#2a2a35', border: '1px solid #3a3a45', borderRadius: '4px', padding: '1px 5px', fontSize: '7.5px', color: '#f5a623', whiteSpace: 'nowrap' }}>● vision</span>
                    <span style={{ background: '#2a2a35', border: '1px solid #3a3a45', borderRadius: '4px', padding: '1px 5px', fontSize: '7.5px', color: '#0fffd4', whiteSpace: 'nowrap' }}>● sonnet 4.6</span>
                  </div>
                  {/* Skills strip */}
                  <div style={{ padding: '5px 6px', borderBottom: '1px solid #2a2a35', display: 'flex', flexWrap: 'wrap', gap: '3px', flexShrink: 0 }}>
                    {['Extract Invoice Data','Check upcoming events','Summarize','Rewrite professionally','Calculate Totals','Explain this','Fix grammar','Draft Response','Create FAQ'].map(s => (
                      <span key={s} className={`demo-skill-btn${s === 'Summarize' ? ' active-skill' : ''}`}>{s}</span>
                    ))}
                  </div>
                  {/* Input */}
                  <div style={{ padding: '6px 8px', borderBottom: '1px solid #2a2a35', display: 'flex', alignItems: 'flex-start', gap: '6px', flexShrink: 0, minHeight: step === 5 ? '68px' : '32px', transition: 'min-height 0.3s ease' }}>
                    <span style={{ fontSize: '11px', color: '#555', marginTop: '1px' }}>🔍</span>
                    <span style={{ flex: 1, fontSize: '11px', color: '#e8e8e0', lineHeight: 1.5 }}>
                      {step === 2 && <>{QUERY1.slice(0, typed)}<span className="cursor" style={{ background: 'var(--accent)', width: '2px', height: '12px', display: 'inline-block', verticalAlign: 'text-bottom', marginLeft: '1px' }} /></>}
                      {step >= 3 && step <= 4 && QUERY1}
                      {step === 5 && (
                        <>
                          {QUERY2.slice(0, typed).split('\n').map((line, i, arr) => (
                            <span key={i} style={{ display: 'block' }}>
                              <span style={{ color: '#666', fontSize: '10px' }}>{i + 1}.</span>{' '}{line}
                              {i === arr.length - 1 && <span className="cursor" style={{ background: 'var(--accent)', width: '2px', height: '11px', display: 'inline-block', verticalAlign: 'text-bottom', marginLeft: '1px' }} />}
                            </span>
                          ))}
                        </>
                      )}
                      {step >= 6 && (
                        QUERY2_LINES.map((line, i) => (
                          <span key={i} style={{ display: 'block' }}><span style={{ color: '#666', fontSize: '10px' }}>{i + 1}.</span>{' '}{line}</span>
                        ))
                      )}
                      {step === 2 || step >= 3 ? null : <span style={{ color: '#444' }}>Ask anything...</span>}
                      {step < 2 && <span style={{ color: '#444' }}>Ask anything...</span>}
                    </span>
                    <span style={{ fontSize: '12px', color: '#555' }}>📎</span>
                  </div>
                  {/* Body — natural height, palette grows as content appears */}
                  <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: step >= 3 ? '7px 8px' : '0', gap: '6px', transition: 'padding 0.3s ease' }}>
                    {/* Thinking dots — step 3 */}
                    {step === 3 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555', fontSize: '10px' }}>
                        <span className="demo-dots"><span /><span /><span /></span> Reading spreadsheet data…
                      </div>
                    )}
                    {/* AI clarifying questions — steps 4, 5, 6, 7 */}
                    {step >= 4 && (
                      <>
                        <div className="demo-bubble" style={{ alignSelf: 'flex-end', background: '#0d8a6a', color: '#fff', borderRadius: '10px 10px 2px 10px', padding: '5px 9px', fontSize: '10px', maxWidth: '95%', lineHeight: 1.4 }}>
                          Summarise these sales numbers into a short email report
                        </div>
                        <div className="demo-ai-card" style={{ background: '#22222c', border: '1px solid #2e2e3e', borderRadius: '8px', padding: '7px 9px', fontSize: '10px', color: '#d0d0cc', lineHeight: 1.55 }}>
                          <div style={{ color: '#888', marginBottom: '4px' }}>I need a few details:</div>
                          <div style={{ marginBottom: '2px' }}>1. <strong style={{ color: '#e8e8e0' }}>Subject</strong> — subject line?</div>
                          <div style={{ marginBottom: '2px' }}>2. <strong style={{ color: '#e8e8e0' }}>Recipient</strong> — email address?</div>
                          <div style={{ marginBottom: '2px' }}>3. <strong style={{ color: '#e8e8e0' }}>Language</strong> — EN / RU / other?</div>
                          <div>4. <strong style={{ color: '#e8e8e0' }}>Context</strong> — period, highlights?</div>
                        </div>
                      </>
                    )}
                    {/* Thinking again — step 6 */}
                    {step === 6 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555', fontSize: '10px' }}>
                        <span className="demo-dots"><span /><span /><span /></span> Composing email &amp; opening EM Client…
                      </div>
                    )}
                  </div>
                  {/* Footer */}
                  <div style={{ padding: '4px 8px', borderTop: '1px solid #2a2a35', display: 'flex', justifyContent: 'space-between', background: '#141418', flexShrink: 0, marginTop: '1px' }}>
                    {['Esc — close','EN','Panel ↗','Exit'].map(f => (
                      <span key={f} style={{ fontSize: '8.5px', color: f === 'Panel ↗' ? '#0fffd4' : '#444' }}>{f}</span>
                    ))}
                  </div>
                </div>

                {/* ── Email client overlay — step 7 ── */}
                {step === 7 && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 20, paddingTop: '10px', paddingRight: '10px' }}>
                    <div className="demo-email" style={{ width: '75%', height: '92%', background: '#1e1e24', border: '1px solid #3a3a50', borderRadius: '6px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
                      {/* Email title bar */}
                      <div style={{ background: '#252530', borderBottom: '1px solid #32323f', padding: '4px 8px', display: 'flex', alignItems: 'center', fontSize: '9px', color: '#aaa', flexShrink: 0 }}>
                        <span style={{ flex: 1, textAlign: 'center', color: '#ccc', fontSize: '9px' }}>Week 24 Sales Summary — New Message</span>
                        <span style={{ color: '#555' }}>— □ ✕</span>
                      </div>
                      {/* Toolbar */}
                      <div style={{ background: '#252530', borderBottom: '1px solid #2a2a35', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                        <span style={{ background: '#e8931a', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '9px', fontWeight: 700 }}>📤 Send</span>
                        <span style={{ fontSize: '8.5px', color: '#777' }}>🖊 "Assistant24" &lt;support@assistant24.tech&gt;</span>
                      </div>
                      {/* To */}
                      <div style={{ padding: '3px 8px', borderBottom: '1px solid #252530', display: 'flex', alignItems: 'center', gap: '5px', background: '#1a1a1f', flexShrink: 0 }}>
                        <span style={{ fontSize: '8.5px', color: '#777', minWidth: '36px' }}>To:</span>
                        <span style={{ background: '#2a4a6a', border: '1px solid #3a6a9a', borderRadius: '3px', padding: '1px 5px', fontSize: '8.5px', color: '#8ad4ff' }}>sales@sales.com ✕</span>
                      </div>
                      {/* Subject */}
                      <div style={{ padding: '3px 8px', borderBottom: '1px solid #252530', display: 'flex', alignItems: 'center', gap: '5px', background: '#1a1a1f', flexShrink: 0 }}>
                        <span style={{ fontSize: '8.5px', color: '#777', minWidth: '36px' }}>Subject:</span>
                        <span style={{ fontSize: '8.5px', color: '#ddd' }}>Week 24 Sales Summary</span>
                      </div>
                      {/* Body */}
                      <div style={{ flex: 1, padding: '8px 10px', fontSize: '8.5px', color: '#222', lineHeight: 1.6, overflow: 'hidden', background: '#fff' }}>
                        <p style={{ marginBottom: '5px' }}>Dear Team,</p>
                        <p style={{ marginBottom: '5px' }}>Please find below the executive summary for Week 24, 2026.</p>
                        <p style={{ marginBottom: '3px' }}><strong style={{ color: '#111' }}>Overall Performance</strong><br />Total sales reached <strong>$92,000</strong> — Friday was the strongest day at $22,600.</p>
                        <p style={{ marginBottom: '2px', marginTop: '5px' }}><strong style={{ color: '#111' }}>Regional Breakdown</strong></p>
                        <p style={{ marginBottom: '1px' }}>– <strong>East</strong> led at $28,200 &nbsp;– <strong>North</strong> $23,900</p>
                        <p style={{ marginBottom: '1px' }}>– <strong>South</strong> $21,400 &nbsp;– <strong>West</strong> $18,500 (−6%)</p>
                        <p style={{ marginBottom: '2px', marginTop: '5px' }}><strong style={{ color: '#111' }}>Highlights</strong></p>
                        <p style={{ marginBottom: '1px' }}>🏆 Enterprise licences up <strong>+18%</strong> vs last week</p>
                        <p style={{ marginBottom: '5px' }}>⚠️ West region down 6% — follow-up recommended</p>
                        <p>Best regards,<br />Aristides D.<br /><span style={{ color: '#1a6abf' }}>support@assistant24.tech</span></p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>


          </div>
        </section>

        {/* ── Divider ───────────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* ── Features ─────────────────────────────────────────────────────── */}
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '100px 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.875rem' }}>{t.whyEyebrow}</p>
            <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', lineHeight: 1.15 }}>{t.whyTitle}</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {t.features.map((f, i) => (
              <div key={i} className="feature-card" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '2rem' }}>
                <div className="feature-icon" style={{ fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--text-muted)', transition: 'color 0.2s' }}>{f.icon}</div>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{f.eyebrow}</p>
                <h3 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.875rem', lineHeight: 1.25 }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comparison (vs generic AI chat) ──────────────────────────────── */}
        <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{t.vsTitle}</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t.vsLabelBad}</p>
                {t.vsBad.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0', borderBottom: i < t.vsBad.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span style={{ color: 'var(--error)', fontSize: '0.75rem' }}>✕</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{item}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: '12px', padding: '1.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem' }}>{t.vsLabelGood}</p>
                {t.vsGood.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0', borderBottom: i < t.vsGood.length - 1 ? '1px solid var(--accent-border)' : 'none' }}>
                    <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>✓</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Why it feels different (replaces ZupFlash comparison) ────────── */}
        <section style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)', padding: '100px 2rem' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <p style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: '0.875rem'
              }}>
                {t.differentEyebrow}
              </p>
              <h2 style={{
                fontFamily: 'var(--font-display), system-ui, sans-serif',
                fontSize: 'clamp(1.7rem, 3vw, 2.4rem)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: 'var(--text-primary)',
                lineHeight: 1.15
              }}>
                {t.differentTitle}
              </h2>
            </div>

            <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface-1)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{
                      textAlign: 'left',
                      padding: '1.1rem 1.5rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                      width: '22%',
                    }}></th>
                    <th style={{
                      textAlign: 'left',
                      padding: '1.1rem 1.5rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      fontSize: '0.82rem',
                      borderLeft: '1px solid var(--border)',
                      width: '39%',
                    }}>
                      {lang === 'ru' ? 'Обычный AI-чат' : 'Traditional AI chat'}
                    </th>
                    <th style={{
                      textAlign: 'left',
                      padding: '1.1rem 1.5rem',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      fontSize: '0.95rem',
                      borderLeft: '1px solid var(--border)',
                      borderBottom: '3px solid var(--accent)',
                      width: '39%',
                    }}>
                      Assistant24
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.differentTable.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < t.differentTable.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <td style={{
                        padding: '1.2rem 1.5rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        verticalAlign: 'top',
                      }}>
                        {row.feature}
                      </td>
                      <td style={{
                        padding: '1.2rem 1.5rem',
                        color: 'var(--text-secondary)',
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                        borderLeft: '1px solid var(--border)',
                        verticalAlign: 'top',
                      }}>
                        {row.traditional}
                      </td>
                      <td style={{
                        padding: '1.2rem 1.5rem',
                        color: 'var(--accent)',
                        fontWeight: 500,
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                        borderLeft: '1px solid var(--border)',
                        verticalAlign: 'top',
                      }}>
                        {row.you}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.875rem' }}>{t.howEyebrow}</p>
            <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', lineHeight: 1.15 }}>{t.howTitle}</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '28px', left: 'calc(16.6% + 1rem)', right: 'calc(16.6% + 1rem)', height: '1px', background: 'var(--accent-border)', zIndex: 0 }} />

            {t.steps.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0 1.5rem', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--surface-1)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.01em' }}>
                  {step.n}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--text-primary)', marginBottom: '0.625rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', padding: '100px 2rem', textAlign: 'center' }}>
            <div style={{ width: '160px', height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', margin: '0 auto 3rem' }} />
            <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '1rem' }}>{t.ctaTitle}</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>{t.ctaSub}</p>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-primary cta-btn" style={{ width: 'auto', padding: '0.875rem 2.5rem', fontSize: '1rem' }}>{t.ctaBtn}</button>
            </Link>
            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t.ctaSignIn}{' '}
              <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{t.ctaSignInLk}</Link>
            </p>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1100px', margin: '0 auto' }}>
          <span className="wordmark">
  ASSISTANT <span>24</span>
</span>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.footerSub}</p>
        </footer>

      </div>
    </>
  )
}
