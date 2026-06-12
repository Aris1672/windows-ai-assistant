# Windows AI Assistant — Project Status

## ⚡ Quick Resume (read this first after a break)

> If starting a new chat, read this section first — it summarises exactly where the project is and what to do next.

**What this project is:** A Windows desktop app (Electron) that sits in the system tray and pops up a contextual AI command palette on `Ctrl + Space`. It detects what app/file is active, assembles personalised instructions + skills from Supabase, and calls Claude via a Vercel proxy.

**Current status:** Phases 1–5 complete + Context Tray shipped. Full web app live on Vercel. Electron app working end-to-end. Analytics & billing layer fully live: real-time token tracking, admin billing dashboard with per-user spend/trial status/cost, and manual subscription activation wired to `activateSubscription()` — admin can activate any user from `/admin/billing` with one click, which flips status to `active`, sets `subscription_ends_at = now + 30d`, resets monthly tokens, and auto-logs a `billing_records` entry. Currently in 2-week beta test with friends. Action logging fully working — all AI queries and write-actions are now recorded in the actions table, feeding History and Analytics dashboards with real data. Multiline input shipped — Enter submits, Shift+Enter inserts newline; textarea auto-expands up to 6 rows.

**Next immediate step:** Beta test is running — collect real token consumption data. Remaining items: trial expiry email reminders (Vercel Cron).

Workflow memory complete: every palette session is saved as a conversation with messages; the assembler injects recent activity into the system prompt for context-aware responses. Action history synced to Supabase after every action execution, linked to its conversation and context.

**Monorepo structure:**
```
root/                          ← npm workspaces root
├── web/                       ← Next.js app (Vercel) — backend + web UI
│   └── src/
│       ├── middleware.ts      ← ✅ Route protection (done)
│       ├── app/
│       │   ├── api/
│       │   │   ├── user/          ← ✅ GET + PUT (done)
│       │   │   ├── instructions/  ← ✅ GET + POST + PATCH + DELETE (done)
│       │   │   ├── skills/        ← ✅ GET + POST + PATCH + DELETE (done)
│       │   │   ├── actions/               ← ✅ GET (paginated history) + POST (sync from Electron — both AI queries and write-actions logged; status values mapped to DB constraint)
│       │   │   ├── conversations/         ← ✅ POST — create conversation per palette session
│       │   │   ├── conversations/[id]/messages/ ← ✅ POST — batch save message exchanges
│       │   │   ├── auth/signout/  ← ✅ POST — server-side sign out (done)
│       │   │   └── context/       ← ✅ Done — streaming SSE, auth, skill injection, real-time token tracking, context tray passthrough
│       │   ├── dashboard/     ← ✅ All pages fully wired to real data
│       │   ├── login/         ← ✅ Done (real Supabase auth)
│       │   ├── register/      ← ✅ Done (real Supabase auth)
│       │   └── admin/         ← ✅ Done (overview, users, analytics, billing + activation, settings)
│       ├── components/
│       │   ├── Sidebar.tsx        ← ✅ Done + i18n + language toggle
│       │   └── AdminSidebar.tsx   ← ✅ Done
│       ├── locales/
│       │   ├── en.json            ← ✅ English strings (web)
│       │   └── ru.json            ← ✅ Russian strings (web)
│       └── lib/
│           ├── supabase.ts        ← ✅ Done (server + user + admin clients)
│           ├── auth.ts            ← ✅ Done (requireAuth: Bearer token + cookie fallback, jsonError, jsonOk)
│           ├── assembler.ts       ← ✅ Done (instructions + skills + workflow memory + context tray injection)
│           ├── i18n.ts            ← ✅ i18next config (EN/RU, localStorage detection)
│           └── trial-subscription.ts ← ✅ Done (getUserSubscriptionStatus, markTrialExpiredIfNeeded, activateSubscription)
└── app/                       ← Electron app (Windows desktop) — core working ✅
    └── src/
        ├── main/
        │   ├── index.ts           ← ✅ Main process, IPC handlers, stream proxy
        │   ├── windows.ts         ← ✅ Palette window (frameless, always-on-top) + hidePaletteForAction()
        │   ├── tray.ts            ← ✅ System tray icon + menu
        │   ├── hotkey.ts          ← ✅ Ctrl+Space global hotkey
        │   ├── context-detector.ts ← ✅ Active app, file path, selected text
        │   └── store.ts           ← ✅ Persistent local store (token, prefs, contextTray)
        ├── preload/
        │   └── index.ts           ← ✅ IPC bridge (electronAPI on window)
        └── renderer/src/
            ├── App.tsx            ← ✅ Auth gate (login ↔ palette)
            ├── lib/
            │   └── i18n.ts            ← ✅ i18next config (EN/RU, localStorage detection)
            ├── locales/
            │   ├── en.json            ← ✅ English strings
            │   └── ru.json            ← ✅ Russian strings
            ├── components/
            │   ├── CommandPalette.tsx ← ✅ Overlay UI + SSE streaming + actions + skills + conversation tracking + context tray + action logging + multiline input + i18n
            │   └── LoginScreen.tsx    ← ✅ Calls /api/auth/login, stores token + i18n
            └── types/electron.d.ts   ← ✅ window.electronAPI types
```

---

## Product Vision

> *A contextual intelligence layer for Windows. Hit `Ctrl + Space` anywhere, and get instant AI actions tailored to what you're doing — not a chatbot, but a smart co-worker who knows your workflow.*

This is **not** a giant chatbot window. It is a fast, focused, contextual command palette that understands what the user is working on, remembers their workflows, adapts to them over time, and executes small actions safely — all triggered by a single keystroke from anywhere in Windows.

---

## What Makes This Different

| Typical AI Chatbot | This Product |
|---|---|
| You go to it | It's always one keystroke away |
| Generic responses | Context-aware actions |
| You describe everything | It already knows what you're working on |
| Talks, doesn't act | Reads AND executes (safely) |
| Same for everyone | Personalised via instructions + skills |
| Static | Gets smarter the more you use it |

---

## Core UX — Command Palette

The user hits `Ctrl + Space` from **any** application. A small, focused overlay appears instantly with context-aware action suggestions:

- "Summarize this"
- "Rewrite professionally"
- "Find related files"
- "Explain this error"
- "Move these invoices"
- "Prepare meeting notes"

The AI detects what app is active, what text is selected, and what the user is doing — and surfaces the right Skills for that moment. Chat is available as a secondary mode, not the primary one.

---

## Product Architecture — Three Layers

### Layer 1 — Core AI Engine
Always-on, built-in capabilities every user gets out of the box. No configuration required.
- Understand screen context (active app, selected text, file path)
- Summarize, rewrite, translate, search, answer, execute automations

### Layer 2 — User Instructions
Persistent behavioural rules the user configures once. Always active.
- "Keep responses short" / "Use Dutch for translations" / "Prefer formal tone"
- Configured as structured settings — never raw prompts unless user chooses
- Optional context conditions: scoped to a specific app or folder

### Layer 3 — Skills
Reusable named actions. Appear in the command palette, triggered manually.
- "Prepare meeting summary" / "Clean Downloads folder" / "Rename scanned invoices"
- Context-aware surfacing: shown/hidden automatically based on active app/folder
- Skills ≠ Instructions. Instructions shape behaviour. Skills are triggered actions.

```
Layer 1  →  Built-in abilities         (always works, zero setup)
Layer 2  →  My preferences & rules     (feels personal, always active)
Layer 3  →  My saved actions           (context-aware, triggered on demand)
```

---

## Architecture

```
Windows App (Electron + React + TypeScript)
              ↓ HTTPS  (context bundle)
    Vercel (Next.js API Routes)
       ├── Assembles Layer 2 instructions (with active context conditions)
       ├── Surfaces matching Layer 3 skills
       ├── Calls Anthropic Claude API
       └── Reads/writes Supabase
           ├── users, settings, instructions, skills
           └── action history, workflows
```

All API keys stored on Vercel — never exposed in the desktop app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Windows App | Electron + React + TypeScript |
| Command Palette UI | React overlay, always-on-top, frameless window |
| Global Hotkey | `Ctrl + Space` via Electron globalShortcut |
| Context Detection | Active window API + clipboard + file path + screenshot |
| Backend / Proxy | Next.js on Vercel |
| Instruction + Skill Assembler | Vercel function — merges context into one prompt |
| Database & Auth | Supabase |
| AI Model | Anthropic Claude API (text + vision) |
| Multilingual UI | i18next (follows OS locale) |
| Source Control | GitHub |
| CI/CD | GitHub → Vercel (auto-deploy) |

---

## Supabase Schema

All tables are **live in Supabase**. RLS is enabled.

| Table | Purpose |
|---|---|
| `users` | Auth, profile, subscription tier — linked to `auth.users.id` |
| `instructions` | Layer 2 rules per user, with optional context conditions |
| `skills` | Layer 3 saved actions per user, with context-matching rules |
| `skill_steps` | Individual steps / sub-actions within a skill |
| `actions` | Log of every action taken (for history + workflow learning) |
| `conversations` | Full conversation history per user |
| `messages` | Individual messages per conversation |

### `instructions` Table
```
id, user_id, label, instruction_text,
context_app (nullable), context_folder (nullable),
is_active (bool), sort_order (int), created_at, updated_at
```

### `skills` Table
```
id, user_id, name, description, prompt,
context_app (nullable), context_folder (nullable),
is_destructive (bool), is_active (bool), sort_order (int),
created_at, updated_at
```

---

## Action Safety Model

| Action Type | Examples | Behaviour |
|---|---|---|
| **Read-only** | Summarize, explain, rewrite, translate | Execute immediately |
| **Write / Destructive** | Move files, edit documents, send email | Always show confirmation first |

---

## Context Awareness (How It Works)

When `Ctrl + Space` fires, the Electron app captures:
1. **Active application** — what program is in focus
2. **Active file / folder path** — matches context conditions on Skills and Instructions
3. **Selected text** — what the user has highlighted
4. **Screenshot (optional, Phase 4)** — sent to Claude Vision
5. **Context Tray** — user-curated clips saved across palette sessions (text + source app + file path)
6. **Assembled context** — fetched from Supabase, merged by Vercel

---

## Vercel Web App — Pages & Routes

| Route | Purpose | Who |
|---|---|---|
| `/` | Landing page | Public |
| `/register` | Create new account | Public |
| `/login` | Log in | Users |
| `/dashboard` | Personal user area | Users |
| `/dashboard/instructions` | Manage Layer 2 instructions | Users |
| `/dashboard/instructions/new` | Create a new instruction | Users |
| `/dashboard/skills` | Manage Layer 3 skills | Users |
| `/dashboard/skills/new` | Create a new skill | Users |
| `/dashboard/history` | Action & conversation history | Users |
| `/dashboard/billing` | Subscription plan (future) | Users |
| `/admin` | Admin dashboard | Administrator |
| `/admin/users` | View and manage all users | Administrator |
| `/admin/analytics` | Usage stats — actions/day, top apps, action types | Administrator |
| `/admin/billing` | Token spend, trial status, subscription activation, payment records | Administrator |
| `/admin/settings` | Global app configuration | Administrator |
| `/api/chat` | Claude proxy route | Internal |
| `/api/context` | Context bundle receiver + assembler | Internal |
| `/api/user` | User data from Supabase | Internal |
| `/api/instructions` | CRUD for user instructions | Internal |
| `/api/skills` | CRUD for user skills | Internal |
| `/api/actions` | Action history with search/filter/pagination | Internal |
| `/api/auth/signout` | Server-side sign out, clears session cookies | Internal |

---

## User Roles

| Role | Access |
|---|---|
| User | Own data only (enforced by Supabase RLS) |
| Administrator | Full access to all data and admin panel |

---

## What Still Needs Building

### Phase 1 — Foundation
- [x] GitHub repository setup (monorepo: `/app`, `/web`)
- [x] Monorepo folder structure created
- [x] Root `package.json` with npm workspaces configured
- [x] `web/package.json` created with Next.js, Tailwind, TypeScript, Supabase
- [x] `web/tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js` created
- [x] `npm install` working from root (364 packages installed)
- [x] `.gitignore` updated (node_modules, .env, .next, dist, Electron build output)
- [x] Supabase project live — all tables created, RLS enabled
- [x] All API route files stubbed (`context`, `instructions`, `skills`, `user`)
- [x] All lib files stubbed (`supabase.ts`, `auth.ts`, `assembler.ts`)
- [x] Vercel project setup + environment variables configured
- [x] `web/src/lib/supabase.ts` — server + user (Bearer) + admin clients
- [x] `web/src/lib/auth.ts` — `requireAuth` (Bearer + cookie fallback), `jsonError`, `jsonOk` helpers
- [x] `web/src/middleware.ts` — route protection (dashboard + admin → login; auth pages → dashboard if logged in)
- [x] `/api/user/route.ts` — GET profile + PUT update (with admin-only tier guard)
- [x] `/api/instructions/route.ts` — GET all, POST new
- [x] `/api/instructions/[id]/route.ts` — PATCH, DELETE
- [x] `/api/skills/route.ts` — GET all, POST new
- [x] `/api/skills/[id]/route.ts` — PATCH, DELETE
- [x] `web/src/lib/assembler.ts` — instruction + skill assembler (context filtering, system prompt builder)
- [x] `/api/context/route.ts` — streaming SSE proxy to Claude, auth, skill injection

### Phase 2 — Web (Vercel / Next.js)
- [x] `/register` page — Supabase `signUp` + email confirmation flow
- [x] `/login` page — Supabase `signInWithPassword` + redirect to dashboard
- [x] `/dashboard` — overview with real instruction/skill/action counts (bug fixed: actions total was hardcoded to 0)
- [x] `/dashboard/instructions` — full CRUD: list, inline edit, toggle active, delete confirm, context badges
- [x] `/dashboard/instructions/new` — create form with context conditions
- [x] `/dashboard/skills` — full CRUD: list, inline edit, toggle active, delete confirm, destructive flag
- [x] `/dashboard/skills/new` — create form with prompt, context conditions, destructive flag
- [x] `/dashboard/history` — action log with search, status filter (All/Done/Error/Pending), pagination, relative timestamps
- [x] Wire dashboard pages to real API data 
- [x] `/admin` — admin panel with login protection 
- [x] Landing page `/` — marketing, features, download button (bilingual EN/RU)
- [x] **Russia compliance** — all Supabase traffic proxied through Vercel: `supabase-browser.ts` deleted; dashboard pages call `/api/*` routes via `fetch`; `Sidebar.tsx` signs out via `/api/auth/signout`; `auth.ts` supports Bearer token (Electron) + cookie session (web) in a single `requireAuth` function; new `/api/actions` route for history page

### Phase 3 — Windows App (Electron) — CORE PRODUCT
- [x] Electron shell setup (React + TypeScript + electron-vite)
- [x] Login screen (calls Vercel `/api/auth/login`, stores Bearer token in `store.json`)
- [x] System tray icon — app runs silently in background
- [x] Global hotkey `Ctrl + Space` — triggers overlay from anywhere in Windows
- [x] Command palette overlay UI — frameless, always-on-top, fast
- [x] Active window detection
- [x] Active file / folder path detection
- [x] Selected text capture
- [x] Context bundle — packages all context, sends to Vercel `/api/context` via main-process proxy
- [x] SSE streaming — chunks forwarded to renderer via IPC, rendered live in palette
- [x] Token persistence — stored in `userData/store.json`, survives restarts
- [x] IPC bridge — full `window.electronAPI` surface (preload, typed)
- [x] Bug fix: `net.fetch` + `AbortSignal` drops body — removed signal from fetch, cancellation handled in read loop
- [x] **Action executor** — `app/src/main/actions.ts` (`insert_text`, `copy_to_clipboard`, `open_folder`, `open_file`, `open_url`)
- [x] **`execute-action` IPC handler** — wired in `index.ts` + exposed in preload
- [x] **Confirm UI in palette** — `insert_text` requires confirm; safe actions fire immediately
- [x] **Assembler system prompt update** — explicit ✅ can-do / ❌ cannot-do table; action XML format + examples
- [x] Action menu — context-aware skills rendered as buttons in palette
- [x] Multilingual UI with `i18next` — EN/RU, language toggle in palette footer + sidebar, localStorage persistence ← **DONE**
- [x] Auto-updater (`electron-updater`) ← **DONE**
- [x] Windows installer (`.exe`) packaging ← **DONE**

### Phase 4 — Intelligence & Memory
- [x] Screenshot capture → Claude Vision for deeper context
- [x] Workflow memory — conversations + messages saved per session; assembler injects recent activity into system prompt
- [x] Action history synced to Supabase — POST /api/actions called after every execution, linked to conversation_id
- [x] Pre-built skill templates (Developer, Writer, Finance, Support, etc.)
- [x] Context Tray — multi-clip context builder; user pins selected text from any app across palette sessions; tray persists in store.ts, injected into system prompt as labelled blocks; max 10 clips (oldest dropped); "Add to tray" button in palette + tray panel with per-clip remove + clear all
- [x] Token tracking schema — token_usage + billing_records tables, RLS policies, increment_user_tokens() function
- [x] Real-time token tracking — /api/context updated to capture input/output tokens after every Claude call
- [x] Trial/subscription system — 7-day trial auto-created on signup; subscription_status, trial_ended_at, subscription_ends_at fields live
- [x] /api/actions updated — inserts into actions table on every call (AI queries + write-actions); status values mapped to DB constraint (done→completed, error→failed); token tracking optional
- [x] Token cost validated — Claude Sonnet 4-6 at ~$0.0000041/token; avg query costs $0.01–0.02; €19.90/month pricing confirmed healthy
- [x] Admin billing dashboard (/admin/billing) — per-user token spend, trial status, days remaining, payment records
- [x] Usage analytics in admin panel — actions/day chart, status breakdown, top apps, top action types
- [x] Subscription activation — admin clicks "Activate" in /admin/billing; flips status to active, sets subscription_ends_at, resets tokens, auto-logs billing_records row
- [ ] Trial expiry email — "Your trial expires in 2 days" reminder (Vercel Cron + email template)
- [ ] Manual billing records — admin logs payments via /admin/billing until Stripe is integrated ← auto-logged on activation now
- [ ] Stripe integration (future — after beta validation)

---

## Build Order (Recommended)

1. ✅ Supabase — auth + tables + RLS
2. ✅ Monorepo + Next.js setup
3. ✅ `lib/supabase.ts` + `lib/supabase-browser.ts` + `lib/auth.ts`
4. ✅ `middleware.ts` — route protection
5. ✅ `/api/user` route
6. ✅ `/login` + `/register` pages (real Supabase auth)
7. ✅ Dashboard UI shells (all pages)
8. ✅ `/api/instructions` + `/api/instructions/[id]`
9. ✅ `/api/skills` + `/api/skills/[id]`
10. ✅ `lib/assembler.ts` + `/api/context` — done
11. ✅ Landing page `/` — done (bilingual EN/RU)
12. ✅ Wire dashboard pages to real API data — done
13. ✅ Admin panel — done (overview, users with role/tier management, analytics, settings)
14. ✅ Electron shell — system tray + global hotkey + context detection
15. ✅ Command palette overlay UI — SSE streaming, login, token persistence
16. ✅ Write-action layer — executor, IPC, confirm UI, assembler prompt ← **DONE**
16.5. ✅ Russia compliance — all Supabase traffic through Vercel, `supabase-browser.ts` deleted ← **DONE**
17. ✅  **Action menu** — skills as buttons in palette 
18. ✅ Screenshot + Claude Vision 
19. ✅ Workflow memory + action history sync 
20. ✅ Pre-built skill templates ← **DONE**
21. ✅ Analytics & billing schema — token_usage, billing_records, trial/subscription columns ← **DONE**
22. ✅ Real-time token tracking — /api/context captures tokens after every Claude call ← **DONE**
23. ✅ Admin billing dashboard (/admin/billing) — token spend, trial status, payment records ← **DONE**
24. [ ] Trial expiry email reminders
25. ✅ Subscription activation — "Activate" button in billing dashboard, auto-logs billing_records ← **DONE**
26. ✅ Windows installer — NSIS `.exe` via electron-builder, GitHub Actions release pipeline ← **DONE**
27. ✅ Auto-updater — electron-updater, in-palette "Restart & update" banner ← **DONE**
28. ✅ Dashboard download modal — appears after onboarding, guides user to install desktop app ← **DONE**
29. ✅ Semantic skill filtering — fuzzy app name matching + system shell detection ← **DONE**
30. ✅ Multilingual UI (`i18next`) — EN/RU for web dashboard + Electron palette, language toggle, localStorage persistence ← **DONE**
31. ✅ Context Tray — multi-clip context builder across palette sessions; "Add to tray" pin button, tray panel UI with remove/clear, persisted in store.ts, injected into assembler system prompt ← **DONE**
32. ✅ Action logging fixed — /api/actions now inserts every AI query + write-action into actions table; CommandPalette fires POST after each stream completes; status constraint bug fixed (completed/failed/confirmed/cancelled) ← **DONE**
33. ✅ Multiline palette input — textarea replaces single-line input; auto-expands up to 140px (~6 rows); Enter submits, Shift+Enter inserts newline ← **DONE**

---

## Environment Variables Needed

These go in `web/.env.local` (local) and Vercel dashboard (production):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

> `NEXT_PUBLIC_` variables are safe to expose to the browser. The service role key and Anthropic key must never be public — server-side only.

---

## Key Decisions & Notes

- The Vercel proxy is the key architectural decision — keeps all secrets server-side, enables access in restricted regions
- The Windows app registers users via the web only; the desktop app handles login only
- Claude handles multilingual detection natively — no extra libraries needed for AI responses
- **The command palette IS the product** — chat is secondary
- **Layer 2 instructions + Layer 3 skills ARE the moat** — compounds with every addition
- Never expose users to raw prompt editing unless they explicitly choose it
- Read-only actions execute immediately; write/destructive always require confirmation
- `insert_text` uses `hidePaletteForAction()` (immediate hide, no animation delay) + 400ms sleep before SendKeys — 250ms was too short for Windows to return focus reliably
- During streaming, `<action>` XML is stripped from live display via `stripActionTagLive()` — users never see raw tags
- The instruction + skill assembler on Vercel is the most critical backend function
- Context conditions are invisible infrastructure — users never think in terms of scopes
- `supabase.ts` exports three clients: `createServerSupabaseClient` (cookies/SSR), `createUserClient` (Bearer token for Electron), `createAdminClient` (service role, server-only). `supabase-browser.ts` has been deleted — no Supabase JS ever runs in the browser
- Dashboard pages call their own Vercel API routes via `fetch({ credentials: 'include' })` — never Supabase directly. The `requireAuth` helper accepts both a Bearer token (Electron) and a Supabase session cookie (web), extracting the real access token in both cases so all downstream code is identical
- All Supabase and Claude traffic is routed through Vercel — required for access from Russia and other restricted regions
- **Context Tray** solves cross-document and cross-app AI tasks — user cherry-picks relevant clips from any source; clips persist across palette open/close cycles and are injected as labelled context blocks in the assembler; capped at 10 clips (oldest dropped automatically)
- `actions.status` check constraint only allows `completed`, `confirmed`, `cancelled`, `failed` — the route maps incoming `done`→`completed` and `error`→`failed` before inserting

---

*Last updated: Context Tray shipped. Action logging fixed — History + Analytics dashboards now receive live data from all AI queries and write-actions.
Workflow memory ✅, Action history ✅, Screenshots ✅, Skill templates ✅, Token tracking ✅, Trial/subscription schema ✅, Admin billing dashboard ✅, Usage analytics ✅, Subscription activation ✅, Windows installer ✅, Auto-updater ✅, Semantic skill filtering ✅, Dashboard download modal ✅, Multilingual UI ✅, Context Tray ✅, Action logging ✅, Multiline input ✅
Remaining open items: Trial expiry emails.*

## Pricing & Billing Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Pricing model | 7-day free trial → €19.90/month | Removes adoption friction; predictable revenue |
| Token model | Monthly flat fee (not pay-as-you-go) | Encourages deep usage once paid; simpler billing |
| Token rate | $0.0000041/token (Claude Sonnet 4-6) | Validated from real Anthropic console: $0.20 for ~49k tokens |
| Avg cost per query | ~$0.01–0.02 | ~500 input + 200 output tokens typical |
| Avg cost per user/month | ~$0.50–$2.50 (50–500 actions) | At €19.90 charge: 8–40× margin |
| Trial duration | 7 days | Long enough to feel value; short enough to convert |
| Renewal flow | Manual "renew?" email link (for now) | No Stripe yet; validate manually during beta |
| Beta test plan | 2 weeks with friends | Collect real token consumption data before public launch |

## Supabase Schema Changes (Phase 5)

### New columns on `users` table
```
is_admin                BOOLEAN          DEFAULT false
trial_started_at        TIMESTAMPTZ      DEFAULT NOW()
trial_ended_at          TIMESTAMPTZ      DEFAULT NOW() + 7 days
subscription_status     VARCHAR(50)      DEFAULT 'trial'   -- 'trial' | 'active' | 'cancelled' | 'expired'
subscription_started_at TIMESTAMPTZ
subscription_ends_at    TIMESTAMPTZ
last_payment_at         TIMESTAMPTZ
tokens_used_this_month  INT              DEFAULT 0
tokens_used_all_time    INT              DEFAULT 0
estimated_cost_usd      DECIMAL(10,4)    DEFAULT 0.0
```

### New table: `token_usage`
Records every Claude call — input tokens, output tokens, cost, action type, model.

### New table: `billing_records`
Manual payment log — amount, date, period, status, notes.

### New Postgres function: `increment_user_tokens(user_id, tokens_count, cost)`
Called after every Claude call to update user's monthly totals in real-time.

### Admin account
`assistant@assistant24.tech` — `is_admin = true`, `role = 'admin'`
