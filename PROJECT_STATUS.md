# Windows AI Assistant — Project Status

## ⚡ Quick Resume (read this first after a break)

> If starting a new chat, read this section first — it summarises exactly where the project is and what to do next.

**What this project is:** A Windows desktop app (Electron) that sits in the system tray and pops up a contextual AI command palette on a configurable hotkey (default `Ctrl + Space`). It detects what app/file is active, assembles personalised instructions + skills from Supabase, and calls Claude via a Vercel proxy.

**Current status:** Phases 1–5 complete + Context Tray shipped. Full web app live on Vercel. Electron app working end-to-end. Analytics & billing layer fully live: real-time token tracking, admin billing dashboard with per-user spend/trial status/cost, and manual subscription activation wired to `activateSubscription()` — admin can activate any user from `/admin/billing` with one click, which flips status to `active`, sets `subscription_ends_at = now + 30d`, resets monthly tokens, and auto-logs a `billing_records` entry. Currently in 2-week beta test with friends. Action logging fully working — all AI queries and write-actions are now recorded in the actions table, feeding History and Analytics dashboards with real data. Multiline input shipped — Enter submits, Shift+Enter inserts newline; textarea auto-expands up to 6 rows. Vision indicator turns amber when active. Dashboard button links to correct Vercel URL. Supabase schema file updated to reflect live DB. User dashboard actions counter fixed — now reads pagination.total instead of page length. Document-level action routing fixed — agent now correctly uses `copy_to_clipboard` for file/document tasks and `insert_text` only for short selected-text transformations; `max_tokens` raised to 64000 to support full document generation; `parseActionFromResponse` hardened against stream truncation. Session persistence fixed — refresh token now stored in `store.ts`, silently refreshed on 401 in main process; users never see "Session expired" unless refresh itself fails. Context hints shipped — amber hint text shown in the palette when no text is selected, guiding users to select+copy (Ctrl+C) first or use file commands directly; 8 cases covered (editor, browser, email, spreadsheet, pdf, code, explorer, generic); fully bilingual EN/RU. File attachment shipped — native Windows file picker via Electron dialog.showOpenDialog; file content injected as fileRef reusing existing file-reader.ts pipeline; amber SVG paperclip icon in palette input row; filename chip confirms attachment.

**Next immediate step:** Trial expiry email reminders (Vercel Cron) — the only remaining open item. Pin a Response, smart model routing (Haiku/Sonnet), palette smooth expand, semantic model routing, and custom hotkey are all shipped.

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
│   │   │   ├── auth/refresh/  ← ✅ POST — exchanges refresh_token for new access_token + refresh_token via Supabase
│       │   │   └── context/       ← ✅ Done — streaming SSE, auth, skill injection, real-time token tracking, context tray passthrough, max_tokens 64000
│       │   ├── dashboard/     ← ✅ All pages fully wired to real data
│       │   ├── login/         ← ✅ Done (real Supabase auth)
│       │   ├── register/      ← ✅ Done (real Supabase auth)
│       │   └── admin/         ← ✅ Done (overview, users, analytics, billing + activation, settings)
│       ├── components/
│       │   ├── Sidebar.tsx        ← ✅ Done + i18n + language toggle
│       │   └── AdminSidebar.tsx   ← ✅ Done
│       ├── locales/
│       │   ├── en.json            ← ✅ English strings + palette.hint (8 context hints) (web)
│       │   └── ru.json            ← ✅ Russian strings + palette.hint (8 context hints) (web)
│       └── lib/
│           ├── supabase.ts        ← ✅ Done (server + user + admin clients)
│           ├── auth.ts            ← ✅ Done (requireAuth: Bearer token + cookie fallback, jsonError, jsonOk)
│           ├── assembler.ts       ← ✅ Done (instructions + skills + workflow memory + context tray injection + document-level action routing)
│           ├── i18n.ts            ← ✅ i18next config (EN/RU, localStorage detection)
│           └── trial-subscription.ts ← ✅ Done (getUserSubscriptionStatus, markTrialExpiredIfNeeded, activateSubscription)
└── app/                       ← Electron app (Windows desktop) — core working ✅
    └── src/
        ├── main/
        │   ├── index.ts           ← ✅ Main process, IPC handlers, stream proxy, resolve-file-refs IPC, silent token refresh on 401
        │   ├── windows.ts         ← ✅ Palette window (frameless, always-on-top) + hidePaletteForAction()
        │   ├── tray.ts            ← ✅ System tray icon + menu
        │   ├── hotkey.ts          ← ✅ Configurable global hotkey — reads from store on startup, supports dynamic re-registration via reregisterHotkey()
        │   ├── context-detector.ts ← ✅ Active app, file path, selected text
        │   ├── file-finder.ts     ← ✅ Extracts file name candidates from query, searches filesystem
        │   └── file-reader.ts     ← ✅ Reads txt/md/csv/json/docx/pdf/xlsx and returns plain text
        │   └── store.ts           ← ✅ Persistent local store (authToken, refreshToken, prefs, contextTray, hotkey)
        ├── preload/
        │   └── index.ts           ← ✅ IPC bridge (electronAPI on window) + setRefreshToken + getHotkey/setHotkey
        └── renderer/src/
            ├── App.tsx            ← ✅ Auth gate (login ↔ palette) + refresh token persistence on login
            ├── lib/
            │   └── i18n.ts            ← ✅ i18next config (EN/RU, localStorage detection)
            ├── locales/
            │   ├── en.json            ← ✅ English strings + palette.hint (8 context hints)
            │   └── ru.json            ← ✅ Russian strings + palette.hint (8 context hints)
            ├── components/
            │   ├── CommandPalette.tsx ← ✅ Overlay UI + SSE streaming + actions + skills + conversation tracking + context tray + action logging + multiline input + amber vision indicator + i18n + file search indicator + truncation-safe action parsing + context hints (no-selection state) + file attachment (native dialog picker, fileRef injection, amber SVG paperclip, filename chip) + custom hotkey recorder (footer button, capture phase keydown, auto-confirm, amber recording state, green saved flash)
            │   └── LoginScreen.tsx    ← ✅ Calls /api/auth/login, stores access_token + refresh_token + i18n
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
| Global Hotkey | User-configurable via palette footer (default `Ctrl + Space`); stored in `store.json`; re-registered live via Electron globalShortcut |
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
- [x] Global hotkey `Ctrl + Space` — triggers overlay from anywhere in Windows; user-configurable via palette footer
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
- [x] Pin a Response — small pin icon on any AI response opens a minimal always-on-top floating window with the pinned text; user can copy from it at any time while working in another app ← **DONE**
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
34. ✅ Vision indicator turns amber when screenshot is captured and Claude Vision is active ← **DONE**
35. ✅ Dashboard button URL fixed — fallback hardcoded to production Vercel URL; dev mode reads from .env ← **DONE**
36. ✅ supabase_schema.sql fully updated — now includes token_usage, billing_records, all users columns, increment_user_tokens() RPC, and migration script ← **DONE**
37. ✅ User dashboard actions counter fixed — was stuck at 20 (page limit); now reads pagination.total from /api/actions response ← **DONE**
38. ✅ File search as context — automatic file detection from query text, content extraction (txt/md/csv/json/docx/pdf/xlsx), injection into Claude context ← **DONE**
39. ✅ Document-level action routing — `assembler.ts` now distinguishes short text (→ `insert_text`) from file/document output (→ `copy_to_clipboard`); examples updated; action table descriptions clarified ← **DONE**
40. ✅ `max_tokens` raised to 64000 — supports full contract/document generation without truncation ← **DONE**
41. ✅ Truncation-safe action parsing — `parseActionFromResponse` in `CommandPalette.tsx` handles streams cut before `</action>` closes; extracts partial content and fires action instead of silently dropping it ← **DONE**
42. ✅ Session persistence — refresh token stored in `store.ts`; `main/index.ts` silently refreshes on 401 and retries stream; new `/api/auth/refresh` Vercel endpoint exchanges refresh_token with Supabase; users never see "Session expired" during normal use ← **DONE**
43. ✅ Context hints — amber hint shown in palette when no text is selected and no conversation active; 8 app-aware cases (editor, browser, email, spreadsheet, pdf, code, explorer, generic); instructs user to Select+Copy (Ctrl+C) then Ctrl+Space, or use file commands directly; fully bilingual EN/RU ← **DONE**
44. ✅ Login route rewritten — `web/src/app/api/auth/login/route.ts` now uses direct `fetch` to Supabase REST (`/auth/v1/token?grant_type=password`) instead of Supabase JS client; eliminates cold-start overhead; `refresh_token` now correctly returned in response ← **DONE**
45. ✅ Attachment icon — paperclip emoji in `CommandPalette.tsx` replaced with SVG icon using `stroke="currentColor"`; now renders in amber `rgba(251, 191, 36, 0.8)` matching Vision indicator; chip icon in attached file pills also updated ← **DONE**
46. ✅ File attachment via native picker — `dialog.showOpenDialog` in Electron opens native Windows file picker without losing palette focus (drag & drop dismissed palette on blur); file read via existing `file-reader.ts` and injected as `fileRef` into context; filename chip shown in palette confirming attachment; amber SVG paperclip replaces emoji so icon colour is CSS-controllable ← **DONE**
47. ✅ Pin a Response — always-on-top floating note window; pin icon on every AI response; minimal frameless window with copy button; user can reference AI output while working in another app ← **DONE**
48. ✅ Smart model routing — Haiku 4.5 for simple/short queries; Sonnet 4.6 for vision, files, long text, complex tasks; model broadcast to frontend; rate calculation fixed (`model === SONNET`) ← **DONE**
49. ✅ Palette max height — window dynamically sized to 90% of screen height; palette card animates smoothly from compact (idle) to 80vh (thinking/streaming/done); `max-height` CSS transition replaces hard snap ← **DONE**
50. ✅ Semantic model router — `web/src/lib/router.ts`; Haiku used as intent classifier before every request; language-agnostic (works in Russian, English, any language); categories: app_control/compose/code/analysis → Sonnet, transform/lookup/other → Haiku; runs in parallel with `assembleContext` via `Promise.all` (zero added latency); JSON fence stripping for robust parse; falls back to Sonnet on error ← **DONE**
51. ✅ Custom hotkey — user clicks hotkey display in palette footer to enter recording mode (amber); presses any modifier+key combo; auto-confirms after 700ms with green flash; re-registers live via `reregisterHotkey()` with rollback on failure; persisted in `store.json`; loaded on app start ← **DONE**

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
- **Auth routes use direct REST fetch, not Supabase JS client** — login and refresh routes call Supabase REST directly (/auth/v1/token). The JS client adds cold-start overhead (session init, auto-refresh setup) causing latency from Russia. All new auth routes must follow this pattern.
- **Context Tray** solves cross-document and cross-app AI tasks — user cherry-picks relevant clips from any source; clips persist across palette open/close cycles and are injected as labelled context blocks in the assembler; capped at 10 clips (oldest dropped automatically)
- `actions.status` check constraint only allows `completed`, `confirmed`, `cancelled`, `failed` — the route maps incoming `done`→`completed` and `error`→`failed` before inserting
- **Document-level action routing rule**: `insert_text` = short selected-text transformations only; `copy_to_clipboard` = any output derived from files or longer than ~500 words. Decision point lives in `assembler.ts` MANDATORY RULE section.
- `max_tokens` is set to 64000 (model maximum for Sonnet) — required for full document generation. Cost impact is negligible at $0.0000041/token even for large outputs.
- `parseActionFromResponse` has a truncation fallback: if stream ends before `</action>` closes, partial content is still extracted and the action fires. Prevents silent failures on large outputs.
- When testing locally, ensure `VITE_WEB_URL=http://localhost:3000` is set in `app/.env` — otherwise the Electron app calls the production Vercel URL and local changes have no effect.
- **Session refresh architecture**: refresh token is stored in `store.json` alongside access token. On 401, `tryRefreshToken()` in `main/index.ts` calls `/api/auth/refresh` → Supabase `/auth/v1/token?grant_type=refresh_token` → updates both tokens in store → retries stream. Renderer never knows the refresh happened. `auth-error` is only sent if the refresh itself fails.
- **File attachment uses native dialog, not drag & drop** — drag & drop dismissed the palette on blur before the file could be dropped; `dialog.showOpenDialog` (Electron main process, IPC to renderer) opens picker without losing focus. File is read by `file-reader.ts` and injected as a `fileRef` — identical pipeline to automatic file search.
- **Context hint logic**: `getContextHint()` in `CommandPalette.tsx` matches `activeApp` via regex to one of 8 hint keys. Hint renders only when `mode === 'idle' && !query && messages.length === 0 && !context?.selectedText`. Color: `rgba(251, 191, 36, 0.8)` (amber 80%). Key UX insight: the app requires Select → Copy (Ctrl+C) → Ctrl+Space, which is the reverse of what users expect — the hint corrects this at the exact moment they make the mistake.
- **Semantic model router**: `web/src/lib/router.ts` — Haiku classifies intent before every request; prompt defines 7 categories mapped to sonnet/haiku; runs in parallel with `assembleContext` via `Promise.all` so it adds zero latency; strips markdown fences before JSON.parse to handle Haiku wrapping output in ```json``` blocks; logs `[router] raw` and `[router] "query" → category → model` to Vercel for debugging; falls back to Sonnet on any parse error.
- **Custom hotkey**: stored as Electron accelerator string in `store.json` (e.g. `"CommandOrControl+Space"`). `hotkey.ts` reads from store on startup and keeps `currentTrigger` reference so `reregisterHotkey()` can unregister old, register new, and roll back if the combo is taken. Recorder in `CommandPalette.tsx` uses capture-phase `keydown` listener (`addEventListener(..., true)`) to intercept before palette's own handlers; `e.stopPropagation()` prevents Escape from closing the palette during recording; auto-confirms after 700ms.

---

*Last updated: v0.7.1 — Semantic model router, custom hotkey.
Workflow memory ✅, Action history ✅, Screenshots ✅, Skill templates ✅, Token tracking ✅, Trial/subscription schema ✅, Admin billing dashboard ✅, Usage analytics ✅, Subscription activation ✅, Windows installer ✅, Auto-updater ✅, Semantic skill filtering ✅, Dashboard download modal ✅, Multilingual UI ✅, Context Tray ✅, Action logging ✅, Multiline input ✅, Vision indicator ✅, Schema sync ✅, Actions counter ✅, File search as context ✅, Document action routing ✅, Session persistence ✅, Context hints ✅, File attachment ✅, Login performance ✅, Pin a Response ✅, Smart model routing (Haiku/Sonnet) ✅, Palette smooth expand ✅, Semantic model router ✅, Custom hotkey ✅
Remaining open items: Trial expiry emails (Vercel Cron).*

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
