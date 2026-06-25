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

    footerSub:  'Только для Windows · © 2025 - 2026 Assistant24. All rights reserved.',

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

  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState(0)
  const CHAR_DELAY = 45

  useEffect(() => {
    const durations = [2400, 650, t.demoQuery.length * CHAR_DELAY + 550, 1100, 3200]
    const id = setTimeout(() => setStep(s => (s + 1) % 5), durations[step])
    return () => clearTimeout(id)
  }, [step, lang, t.demoQuery.length])

  useEffect(() => {
    if (step !== 2) { setTyped(0); return }
    let i = 0
    const id = setInterval(() => {
      i += 1
      setTyped(i)
      if (i >= t.demoQuery.length) clearInterval(id)
    }, CHAR_DELAY)
    return () => clearInterval(id)
  }, [step, lang, t.demoQuery.length])

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        
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
      `}</style>

      <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: 'var(--font-body), system-ui, sans-serif' }}>

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(16px)', background: 'rgba(7,7,9,0.8)',
          padding: '0 2rem', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <a href="https://assistant24.tech/index.html" style={{ textDecoration: 'none' }}>
            <span className="wordmark">ASSISTANT <span>24</span></span>
          </a>

          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.5rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.2rem' }}>
              <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => setLang('en')}>EN</button>
              <button className={`lang-btn${lang === 'ru' ? ' active' : ''}`} onClick={() => setLang('ru')}>RU</button>
            </div>

            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-ghost ghost-btn" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>{t.signIn}</button>
            </Link>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-primary cta-btn" style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.85rem' }}>{t.getStarted}</button>
            </Link>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-grid" style={{ paddingTop: '140px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(15,255,212,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>

            {/* Left: Content copy */}
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
                  <button className="btn-primary cta-btn" style={{ width: 'auto', padding: '0.75rem 1.75rem', fontSize: '0.925rem' }}>{t.download}</button>
                </Link>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.freeBeta}</span>
              </div>
            </div>

            {/* Right: "magic moment" demo */}
            <div style={{ display: 'flex', justifyContent: 'center' }} className="palette-float">
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px', height: '430px' }}>

                {/* Background layer: Host App (Excel Simulation) */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '14px',
                  overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
                  filter: step >= 1 ? 'blur(2px) brightness(0.45)' : 'none',
                  transform: step >= 1 ? 'scale(0.97)' : 'scale(1)',
                  transition: 'filter 0.5s ease, transform 0.5s ease',
                }}>
                  <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3A3A44' }} />
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3A3A44' }} />
                    <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3A3A44' }} />
                    <div style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{t.demoExcelTitle}</div>
                  </div>
                  <div style={{ padding: '1.25rem 1.1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                      <thead>
                        <tr>
                          {t.demoExcelHeaders.map((h, i) => (
                            <th key={i} style={{ textAlign: i === 0 ? 'left' : 'right', padding: '0.4rem 0.3rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {t.demoExcelRows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{
                                textAlign: ci === 0 ? 'left' : 'right', padding: '0.45rem 0.3rem', borderBottom: '1px solid var(--border-subtle)',
                                fontWeight: ci === 0 ? 600 : 400, color: ci === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                                outline: (ri === 0 && ci === 2) ? '1.5px solid var(--accent)' : 'none', outlineOffset: '-1px',
                                background: (ri === 0 && ci === 2) ? 'var(--accent-dim)' : 'transparent',
                              }}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Hotkey activation indicator */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: step === 1 ? 1 : 0, transition: 'opacity 0.2s ease', pointerEvents: 'none', zIndex: 5 }}>
                  {step === 1 && (
                    <div className="demo-key" style={{ background: 'var(--surface-2)', border: '1px solid var(--accent-border)', borderRadius: '10px', padding: '0.6rem 1.1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.55)' }}>
                      <span className="kbd" style={{ fontSize: '0.95rem', color: 'var(--accent)' }}>Ctrl + Space</span>
                    </div>
                  )}
                </div>

                {/* Foreground layer: Command Palette Window Layout */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, bottom: step === 0 ? '4px' : '22px',
                  margin: '0 auto', width: '92%', opacity: step === 0 ? 0 : 1,
                  transform: step === 0 ? 'translateY(14px) scale(0.96)' : 'translateY(0) scale(1)',
                  transition: 'opacity 0.4s ease, transform 0.4s ease, bottom 0.4s ease', zIndex: 4,
                }}>
                  <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(15,255,212,0.06)' }}>

                    {/* App Window Chrome */}
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3A3A44' }} />
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3A3A44' }} />
                      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3A3A44' }} />
                      <div style={{ flex: 1, textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.paletteContext}</div>
                    </div>

                    {/* Form Input Field */}
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>⌘</span>
                      <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {step >= 2 ? t.demoQuery.slice(0, step === 2 ? typed : t.demoQuery.length) : t.palettePlaceholder}
                        {step === 2 && <span className="cursor" style={{ color: 'var(--accent)' }}>▌</span>}
                      </span>
                      <span className="kbd">Esc</span>
                    </div>

                    {/* Environment chips tags */}
                    <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.15rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ color: 'var(--accent)', fontSize: '0.6rem' }}>◎</span> Excel
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.15rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>📁</span> {t.paletteFolder}
                      </span>
                    </div>

                    {/* Content Dynamic Screen Output Container with Fixed Height to avoid Layout Shifts */}
                    <div style={{ padding: '0.25rem 0.5rem 0.875rem', height: '146px', overflow: 'hidden' }}>
                      {step <= 1 && t.paletteItems.slice(0, 3).map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.625rem', borderRadius: '8px', background: item.active ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${item.active ? 'var(--accent-border)' : 'transparent'}`, marginBottom: '0.125rem' }}>
                          <span style={{ color: item.active ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.8rem', width: '16px', textAlign: 'center' }}>{item.icon}</span>
                          <span style={{ fontSize: '0.875rem', color: item.active ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: item.active ? 500 : 400 }}>{item.label}</span>
                          {item.active && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)' }}>↵</span>}
                        </div>
                      ))}

                      {step === 2 && (
                        <div style={{ padding: '0.75rem 0.625rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.55rem 0.625rem', borderRadius: '8px', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                            <span style={{ color: 'var(--accent)', fontSize: '0.8rem', width: '16px', textAlign: 'center' }}>◈</span>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{t.paletteItems[0].label}</span>
                          </div>
                        </div>
                      )}

                      {step === 3 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.875rem 0.625rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <span className="demo-dots"><span /><span /><span /></span>
                          {t.demoReading}
                        </div>
                      )}

                      {step === 4 && (
                        <div style={{ padding: '0.2rem 0.625rem', animation: 'fadeUp 0.35s ease' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                            <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>✓</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>{t.demoResultTitle}</span>
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {t.demoBullets.map((b, i) => (
                              <li key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>{b}</li>
                            ))}
                          </ul>
                          <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', borderRadius: '100px', padding: '0.15rem 0.6rem' }}>
                            <span>↳</span>{t.demoAction}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* ── Features Grid ────────────────────────────────────────────────── */}
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

        {/* ── Comparison Box ──────────────────────────────────────────────── */}
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

        {/* ── Table Matrix ────────────────────────────────────────────────── */}
        <section style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)', padding: '100px 2rem' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.875rem' }}>{t.differentEyebrow}</p>
              <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', lineHeight: 1.15 }}>{t.differentTitle}</h2>
            </div>

            <div style={{ borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface-1)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '1.1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', width: '22%' }}></th>
                    <th style={{ textAlign: 'left', padding: '1.1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.82rem', borderLeft: '1px solid var(--border)', width: '39%' }}>
                      {lang === 'ru' ? 'Обычный AI-чат' : 'Traditional AI chat'}
                    </th>
                    <th style={{ textAlign: 'left', padding: '1.1rem 1.5rem', fontWeight: 700, color: 'var(--accent)', fontSize: '0.95rem', borderLeft: '1px solid var(--border)', borderBottom: '3px solid var(--accent)', width: '39%' }}>
                      Assistant24
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.differentTable.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < t.differentTable.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <td style={{ padding: '1.2rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', verticalAlign: 'top' }}>{row.feature}</td>
                      <td style={{ padding: '1.2rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, borderLeft: '1px solid var(--border)', verticalAlign: 'top' }}>{row.traditional}</td>
                      <td style={{ padding: '1.2rem 1.5rem', color: 'var(--accent)', fontWeight: 500, fontSize: '0.88rem', lineHeight: 1.5, borderLeft: '1px solid var(--border)', verticalAlign: 'top' }}>{row.you}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Steps ────────────────────────────────────────────────────────── */}
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
          <span className="wordmark">ASSISTANT <span>24</span></span>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.footerSub}</p>
        </footer>

      </div>
    </>
  )
}