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

    // App constraints
    appContextName: 'OPENOFFICE 4.1.16',
    searchPlaceholder: 'Ask anything...',
    quickSkills: ['Extract Invoice Data', 'Check upcoming events', 'Summarize', 'Rewrite professionally', 'Categorize Expense', 'Calculate Totals', 'Explain this', 'Fix grammar', 'Format for Spreadsheet'],
    
    // Dynamic Animation Data
    demoQuery: 'Turn these figures into an executive summary email',
    demoAnalysisTitle: 'I need a few details before drafting the email:',
    demoAnalysisLines: [
      '1. **Subject** — What should the subject line be?',
      '2. **Recipient** — Who is this going to?',
      '3. **Language** — Which language should the email be composed in?'
    ],
    demoUserTypedInputs: [
      'Subject: Week 24 Sales Summary',
      'To: sales@salescom',
      'Language: English'
    ],
    emailSubject: 'Week 24 Sales Summary',
    emailTo: 'sales@sales.com',
    emailBody: 'Dear Team,\n\nPlease find below the executive summary for our sales performance during Week 24, 2026.\n\n**Overall Performance**\nTotal company-wide sales for the week reached **$92,000**, with a strong finish — Friday alone accounted for $22,600, the highest single day of the week.\n\n**Regional Breakdown**\n- **East** was the top-performing region with $28,200 (+strongest contributor)\n- **North** followed with $23,900\n- **South** delivered $21,400\n- **West** was the weakest region at $18,500 (–6% vs. last week)\n\n**Highlights**\n- 📈 **Top product:** Enterprise licences, up **+18%** versus last week\n- ⚠️ **Area of attention:** West region, down 6% week-on-week — follow-up recommended\n\n**Daily Trend**\nSales showed a consistent upward trend throughout the week, growing from $15,700 on Monday to $22,600 on Friday — a strong positive momentum heading into Week 25.\n\nPlease don\'t hesitate to reach out if you have any questions or require further detail.'
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
        you:         'Одна горячая копия из любого приложения',
      },
      {
        feature:     'Context',
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

    ctaTitle: 'Готовы работать иначе?',
    ctaSub:   '7 дней бесплатно. Без карты. Работает на Windows 10 и 11.',
    ctaBtn:   'Скачать для Windows — 7 дней бесплатно',
    ctaSignIn:   'Уже есть аккаунт?',
    ctaSignInLk: 'Войти →',

    footerSub:  'Только для Windows · © 2025 - 2026 Assistant24. Все права защищены.',

    appContextName: 'OPENOFFICE 4.1.16',
    searchPlaceholder: 'Спросите что угодно...',
    quickSkills: ['Извлечь инвойс', 'Ближайшие события', 'Суммировать', 'Переписать профи', 'Категории расходов', 'Посчитать итоги', 'Объяснить это', 'Исправить грамматику', 'Формат таблицы'],
    
    demoQuery: 'Turn these figures into an executive summary email',
    demoAnalysisTitle: 'Мне нужны детали перед составлением письма:',
    demoAnalysisLines: [
      '1. **Тема** — Какая должна быть тема письма?',
      '2. **Получатель** — Кому отправить письмо?',
      '3. **Язык** — На каком языке составить текст?'
    ],
    demoUserTypedInputs: [
      'Тема: Week 24 Sales Summary',
      'Кому: sales@salescom',
      'Язык: Английский'
    ],
    emailSubject: 'Week 24 Sales Summary',
    emailTo: 'sales@sales.com',
    emailBody: 'Dear Team,\n\nPlease find below the executive summary for our sales performance during Week 24, 2026.\n\n**Overall Performance**\nTotal company-wide sales for the week reached **$92,000**, with a strong finish — Friday alone accounted for $22,600, the highest single day of the week.\n\n**Regional Breakdown**\n- **East** was the top-performing region with $28,200 (+strongest contributor)\n- **North** followed with $23,900\n- **South** delivered $21,400\n- **West** was the weakest region at $18,500 (–6% vs. last week)\n\n**Highlights**\n- 📈 **Top product:** Enterprise licences, up **+18%** versus last week\n- ⚠️ **Area of attention:** West region, down 6% week-on-week — follow-up recommended\n\n**Daily Trend**\nSales showed a consistent upward trend throughout the week, growing from $15,700 on Monday to $22,600 on Friday — a strong positive momentum heading into Week 25.\n\nPlease don\'t hesitate to reach out if you have any questions or require further detail.'
  },
} as const

type Lang = 'en' | 'ru'

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en')
  const t = CONTENT[lang]

  const [step, setStep] = useState(0)
  const [typed, setTyped] = useState(0)
  const [inputSubStep, setInputSubStep] = useState(0) 
  const CHAR_DELAY = 25

  useEffect(() => {
    const durations = [
      2200, 
      1000, 
      t.demoQuery.length * CHAR_DELAY + 500, 
      3800, 
      2500, 
      4500
    ]
    const id = setTimeout(() => setStep(s => (s + 1) % 6), durations[step])
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

  useEffect(() => {
    if (step !== 3) { setInputSubStep(0); return }
    const t1 = setTimeout(() => setInputSubStep(1), 1000)
    const t2 = setTimeout(() => setInputSubStep(2), 2000)
    const t3 = setTimeout(() => setInputSubStep(3), 3000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); }
  }, [step])

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        
        .hero-fade   { animation: fadeUp 0.7s ease both; }
        .hero-fade-1 { animation-delay: 0.05s; }
        .hero-fade-2 { animation-delay: 0.15s; }
        .hero-fade-3 { animation-delay: 0.28s; }
        .hero-fade-4 { animation-delay: 0.42s; }
        
        .palette-float { animation: float 4s ease-in-out infinite; }
        .cursor { animation: blink 1.1s step-start infinite; }
        .feature-card { transition: border-color 0.2s; }
        .feature-card:hover { border-color: var(--accent-border) !important; }
        
        .cta-btn { transition: background 0.15s, transform 0.15s; }
        .cta-btn:hover { background: var(--accent-hover) !important; transform: translateY(-1px); }
        .lang-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); font-size: 0.75rem; font-weight: 600; padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
        .lang-btn.active { background: var(--accent-dim); border-color: var(--accent-border); color: var(--accent); }
        
        .kbd { display: inline-block; background: #1c1c24; border: 1px solid #2d2d3d; border-bottom-width: 2px; border-radius: 4px; padding: 0.1rem 0.35rem; font-size: 0.75em; font-family: monospace; color: #a0a0b0; }
        
        .openoffice-grid {
          width: 100%; border-collapse: collapse; font-size: 11px; font-family: 'Segoe UI', Tahoma, sans-serif; color: #333;
        }
        .openoffice-grid th, .openoffice-grid td {
          border: 1px solid #d0d0d0; padding: 4px 6px; text-align: right;
        }
        .openoffice-grid th { background: #f0f0f0; font-weight: normal; text-align: left; }
        
        .assistant-panel {
          background: #0f0f14;
          border: 1px solid #23232e;
          border-radius: 12px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.02) inset;
          color: #e2e2e9;
          font-family: system-ui, -apple-system, sans-serif;
          overflow: hidden;
          width: 100%;
        }
        
        .quick-skill-tag {
          font-size: 11px; background: #161622; border: 1px solid #2c2c3e; border-radius: 6px; padding: 4px 8px; color: #b0b0c2; white-space: nowrap;
        }
        
        .native-email-window {
          background: #23232e; 
          border: 1px solid #323242; 
          border-radius: 8px; 
          width: 100%; 
          height: 100%;
          box-shadow: 0 30px 70px rgba(0,0,0,0.8); 
          font-family: system-ui, sans-serif; 
          color: #e5e5ed;
          animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
          overflow: hidden;
        }

        .email-content-area {
          background: #ffffff !important; 
          color: #1a1a1a !important; 
          padding: 16px; 
          overflow-y: auto; 
          flex: 1;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
          line-height: 1.6;
          text-align: left;
        }
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

          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '4rem', alignItems: 'center' }}>

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

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '490px', height: '410px' }}>

                {/* Base Layer: Host App (OpenOffice Calc Canvas) */}
                <div style={{
                  position: 'absolute', inset: 0, background: '#ffffff', border: '1px solid #b5b5b5', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                  filter: step >= 1 && step < 5 ? 'brightness(0.7)' : 'none', transition: 'filter 0.3s'
                }}>
                  <div style={{ background: '#f6f6f6', borderBottom: '1px solid #d5d5d5', padding: '5px 8px', fontSize: '11px', color: '#444', display: 'flex', gap: '10px' }}>
                    <span>Файл</span><span>Правка</span><span>Вид</span><span>Вставка</span><span>Формат</span><span>Сервис</span>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <table className="openoffice-grid">
                      <thead>
                        <tr>
                          <th style={{ width: '25px' }}></th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th><th>G</th><th>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><th>2</th><td style={{ textAlign: 'left', fontWeight: 'bold' }}>Region</td><td>Mon</td><td>Tue</td><td>Wed</td><td>Thu</td><td>Fri</td><td style={{ fontWeight: 'bold' }}>TOTAL</td></tr>
                        <tr><th>3</th><td style={{ textAlign: 'left' }}>North</td><td>$4,200</td><td>$3,800</td><td>$5,100</td><td>$4,600</td><td>$6,200</td><td>$23,900</td></tr>
                        <tr><th>4</th><td style={{ textAlign: 'left' }}>South</td><td>$3,100</td><td>$4,400</td><td>$3,900</td><td>$5,200</td><td>$4,800</td><td>$21,400</td></tr>
                        <tr><th>5</th><td style={{ textAlign: 'left' }}>East</td><td>$5,500</td><td>$5,100</td><td>$4,700</td><td>$5,800</td><td>$7,100</td><td>$28,200</td></tr>
                        <tr><th>6</th><td style={{ textAlign: 'left' }}>West</td><td>$2,900</td><td>$3,300</td><td>$4,100</td><td>$3,700</td><td>$4,500</td><td>$18,500</td></tr>
                        <tr style={{ fontWeight: 'bold' }}><th>7</th><td style={{ textAlign: 'left' }}>TOTAL</td><td>$15,700</td><td>$16,600</td><td>$17,800</td><td>$19,300</td><td>$22,600</td><td>$92,000</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Layer 2: Assistant24 Overlay Panel (Active steps 1 to 4) */}
                {step >= 1 && step <= 4 && (
                  <div className="palette-float" style={{ position: 'absolute', top: '25px', right: '15px', width: '370px', zIndex: 10 }}>
                    <div className="assistant-panel">
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#09090d', borderBottom: '1px solid #1a1a26' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#10ffd4', background: 'rgba(16,255,212,0.1)', padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.03em' }}>
                            {t.appContextName}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#787885' }}>
                          <span style={{ color: '#10ffd4' }}>● vision</span>
                          <span>● sonnet 4.6</span>
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px 6px', display: 'flex', flexWrap: 'wrap', gap: '5px', background: '#0c0c12' }}>
                        {t.quickSkills.slice(0, 4).map((skill, idx) => (
                          <span key={idx} className="quick-skill-tag" style={{ borderColor: idx === 2 && step >= 2 ? '#10ffd4' : '#2c2c3e' }}>
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1c1c28', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                        <span style={{ color: '#686878', fontSize: '12px' }}>🔍</span>
                        <div style={{ flex: 1, fontSize: '12px', color: '#ffffff', textAlign: 'left' }}>
                          {step === 1 ? (
                            <span style={{ color: '#525265' }}>{t.searchPlaceholder}</span>
                          ) : (
                            <span>{t.demoQuery.slice(0, step === 2 ? typed : t.demoQuery.length)}</span>
                          )}
                          {step === 2 && <span className="cursor" style={{ color: '#10ffd4' }}>▌</span>}
                        </div>
                      </div>

                      {step === 3 && (
                        <div style={{ padding: '12px', fontSize: '12px', background: '#0a0a0f', borderTop: '1px solid #181824', textAlign: 'left' }}>
                          <div style={{ color: '#10ffd4', fontWeight: '600', marginBottom: '8px' }}>{t.demoAnalysisTitle}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {t.demoAnalysisLines.map((line, idx) => (
                              <div key={idx} style={{ background: '#12121a', padding: '6px', borderRadius: '4px', border: '1px solid #1d1d29' }}>
                                <div style={{ color: '#a2a2b0' }}>{line}</div>
                                {inputSubStep > idx && (
                                  <div style={{ marginTop: '4px', paddingLeft: '12px', color: '#10ffd4', fontWeight: '500', fontFamily: 'monospace' }}>
                                    &gt; {t.demoUserTypedInputs[idx]}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {step === 4 && (
                        <div style={{ padding: '12px', fontSize: '12px', background: '#0a0a0f', borderTop: '1px solid #181824', textAlign: 'left' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: '#a0a0b2' }}>
                            <span className="demo-dots"><span></span><span></span><span></span></span> Generating execution context loops...
                          </div>
                        </div>
                      )}

                      <div style={{ padding: '6px 12px', background: '#07070a', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#525266' }}>
                        <span>Esc — закрыть</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span>EN</span>
                          <span className="kbd">Ctrl + Space</span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Layer 3: Completed Target Action Window Overlay (Step 5 - eM Client White Body) */}
                {step === 5 && (
                  <div style={{ position: 'absolute', top: '25px', left: '15px', right: '15px', height: '360px', zIndex: 20 }}>
                    <div className="native-email-window" style={{ display: 'flex', flexDirection: 'column' }}>
                      
                      <div style={{ background: '#22222b', padding: '8px 12px', fontSize: '11px', borderBottom: '1px solid #2d2d3d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500', color: '#d1d1d6' }}>{t.emailSubject} — New Message</span>
                        <div style={{ display: 'flex', gap: '8px' }}><span style={{ color: '#8e8e93' }}>‒</span><span style={{ color: '#8e8e93' }}>❑</span><span style={{ color: '#ea5454' }}>✕</span></div>
                      </div>

                      <div style={{ background: '#1c1c24', padding: '10px 12px', borderBottom: '1px solid #2d2d3d', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ color: '#8e8e93', width: '60px' }}>To:</span>
                          <span style={{ background: '#2d2d3e', color: '#10ffd4', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid #3d3d52' }}>
                            {t.emailTo} <span style={{ marginLeft: '4px', color: '#8e8e93', cursor: 'pointer' }}>✕</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid #252533', paddingTop: '6px' }}>
                          <span style={{ color: '#8e8e93', width: '60px' }}>Subject:</span>
                          <span style={{ color: '#ffffff', fontWeight: '500' }}>{t.emailSubject}</span>
                        </div>
                      </div>

                      <div style={{ background: '#252530', borderBottom: '1px solid #323245', padding: '6px 12px', display: 'flex', gap: '12px', color: '#a0a0b0', fontSize: '11px' }}>
                        <span><b>B</b></span> <span><i>I</i></span> <span><u>U</u></span> <span>⌸ Type</span> <span>📎 Attach</span>
                      </div>

                      {/* WHITE WORKING AREA (From 1-5_2.png) */}
                      <div className="email-content-area">
                        <div style={{ color: '#0066cc', marginBottom: '12px' }}>
                          <b>To:</b> <a href={`mailto:${t.emailTo}`} style={{ color: '#0066cc', textDecoration: 'underline' }}>{t.emailTo}</a><br />
                          <b>Subject:</b> {t.emailSubject}
                        </div>
                        
                        <div style={{ whiteSpace: 'pre-wrap', color: '#1a1a1a' }}>
                          {t.emailBody}
                        </div>

                        {/* Professional Signature Block (From 1-5_2.png) */}
                        <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #e0e0e0', fontSize: '11px', color: '#555555', lineHeight: '1.5' }}>
                          <b>Aristides D.</b><br />
                          <span style={{ color: '#dd3b3b' }}>📞</span> +7 9919 57 56 47<br />
                          ✉ support@assistant24.tech<br />
                          🌐 <a href="https://assistant24.tech/index.html" target="_blank" rel="noreferrer" style={{ color: '#0066cc' }}>https://assistant24.tech/index.html</a>
                        </div>
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
              <div key={i} className="feature-card" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '2rem', textAlign: 'left' }}>
                <div className="feature-icon" style={{ fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--text-muted)' }}>{f.icon}</div>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{f.eyebrow}</p>
                <h3 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.875rem', lineHeight: 1.25 }}>{f.title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comparison Box ──────────────────────────────── */}
        <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>{t.vsTitle}</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'left' }}>
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

        {/* ── Table Matrix ────────────────── */}
        <section style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-1)', padding: '100px 2rem' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.875rem' }}>{t.differentEyebrow}</p>
              <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)', lineHeight: 1.15 }}>{t.differentTitle}</h2>
            </div>

            <div style={{ borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--surface-1)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '1.1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', width: '22%' }}></th>
                    <th style={{ textAlign: 'left', padding: '1.1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.82rem', borderLeft: '1px solid var(--border)', width: '39%' }}>
                      Traditional AI chat
                    </th>
                    <th style={{ textAlign: 'left', padding: '1.1rem 1.5rem', fontWeight: 700, color: 'var(--accent)', fontSize: '0.95rem', borderLeft: '1px solid var(--border)', borderBottom: '3px solid var(--accent)', width: '39%' }}>
                      Assistant24
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {t.differentTable.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < t.differentTable.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <td style={{ padding: '1.2rem 1.5rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', verticalAlign: 'top', textAlign: 'left' }}>{row.feature}</td>
                      <td style={{ padding: '1.2rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, borderLeft: '1px solid var(--border)', verticalAlign: 'top', textAlign: 'left' }}>{row.traditional}</td>
                      <td style={{ padding: '1.2rem 1.5rem', color: 'var(--accent)', fontWeight: 500, fontSize: '0.88rem', lineHeight: 1.5, borderLeft: '1px solid var(--border)', verticalAlign: 'top', textAlign: 'left' }}>{row.you}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Steps ─────────────────────────────────────────────────── */}
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
            <h2 style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '1rem' }}>{t.ctaTitle}</h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2.5rem' }}>{t.ctaSub}</p>
            <Link href="/register" style={{ textDecoration: 'none' }}>
              <button className="btn-primary cta-btn" style={{ width: 'auto', padding: '0.875rem 2.5rem', fontSize: '1rem' }}>{t.ctaBtn}</button>
            </Link>
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