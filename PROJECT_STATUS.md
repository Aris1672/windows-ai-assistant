# Windows AI Assistant — Project Status

## ⚡ Quick Resume (read this first after a break)

> If starting a new chat, read this section first — it summarises exactly where the project is and what to do next.

**What this project is:** A Windows desktop app (Electron) that sits in the system tray and pops up a contextual AI command palette on `Ctrl + Space`. It detects what app/file is active, assembles personalised instructions + skills from Supabase, and calls Claude via a Vercel proxy.

**Current status:** Phase 1, Phase 2, and most of Phase 3 complete. Full web app live on Vercel. Electron app built and working — tray, hotkey, login, context detection, SSE streaming all functional. Write-action layer complete and deployed: `actions.ts`, `execute-action` IPC, confirm UI, and assembler system prompt all done. The palette can read context, answer questions, insert text, copy to clipboard, and open files/folders/URLs.

**Next immediate step:** Action menu — surface context-aware skills as clickable buttons in the palette (Phase 3, item 17).

**Monorepo structure:**
```
root/                          ← npm workspaces root
├── web/                       ← Next.js app (Vercel) — backend + web UI
│   └── src/
│       ├── middleware.ts      ← ✅ Route protection (done)
│       ├── app/
│       │   ├── api/
│       │   │   ├── user/      ← ✅ GET + PUT (done)
│       │   │   ├── instructions/  ← ✅ GET + POST + PATCH + DELETE (done)
│       │   │   ├── skills/    ← ✅ GET + POST + PATCH + DELETE (done)
│       │   │   └── context/   ← ✅ Done — streaming SSE, auth, skill injection
│       │   ├── dashboard/     ← ✅ All pages fully wired to real data
│       │   ├── login/         ← ✅ Done (real Supabase auth)
│       │   ├── register/      ← ✅ Done (real Supabase auth)
│       │   └── admin/         ← ✅ Done (overview, users, analytics, settings)
│       ├── components/
│       │   ├── Sidebar.tsx        ← ✅ Done
│       │   └── AdminSidebar.tsx   ← ✅ Done
│       └── lib/
│           ├── supabase.ts        ← ✅ Done (server + user + admin clients)
│           ├── supabase-browser.ts ← ✅ Done (browser client)
│           ├── auth.ts            ← ✅ Done (requireAuth, jsonError, jsonOk)
│           └── assembler.ts       ← ✅ Done (instruction + skill assembler)
└── app/                       ← Electron app (Windows desktop) — core working ✅
    └── src/
        ├── main/
        │   ├── index.ts           ← ✅ Main process, IPC handlers, stream proxy
        │   ├── windows.ts         ← ✅ Palette window (frameless, always-on-top) + hidePaletteForAction()
        │   ├── tray.ts            ← ✅ System tray icon + menu
        │   ├── hotkey.ts          ← ✅ Ctrl+Space global hotkey
        │   ├── context-detector.ts ← ✅ Active app, file path, selected text
        │   └── store.ts           ← ✅ Persistent local store (token, prefs)
        ├── preload/
        │   └── index.ts           ← ✅ IPC bridge (electronAPI on window)
        └── renderer/src/
            ├── App.tsx            ← ✅ Auth gate (login ↔ palette)
            ├── components/
            │   ├── CommandPalette.tsx ← ✅ Overlay UI + SSE streaming + action confirm UI + live XML strip
            │   └── LoginScreen.tsx    ← ✅ Calls /api/auth/login, stores token
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
5. **Assembled context** — fetched from Supabase, merged by Vercel

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
| `/admin/analytics` | Usage stats | Administrator |
| `/admin/settings` | Global app configuration | Administrator |
| `/api/chat` | Claude proxy route | Internal |
| `/api/context` | Context bundle receiver + assembler | Internal |
| `/api/user` | User data from Supabase | Internal |
| `/api/instructions` | CRUD for user instructions | Internal |
| `/api/skills` | CRUD for user skills | Internal |

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
- [x] `web/src/lib/supabase-browser.ts` — browser client for 'use client' components
- [x] `web/src/lib/auth.ts` — `requireAuth`, `jsonError`, `jsonOk` helpers
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
- [ ] Action menu — context-aware skills rendered as buttons in palette
- [ ] Multilingual UI with `i18next`
- [ ] Auto-updater (`electron-updater`)
- [ ] Windows installer (`.exe`) packaging

### Phase 4 — Intelligence & Memory
- [ ] Screenshot capture → Claude Vision for deeper context
- [ ] Workflow memory — learns repeated patterns per user
- [ ] Pre-built skill templates (Developer, Writer, Finance, Support, etc.)
- [ ] Action history synced to Supabase
- [ ] Usage analytics in admin panel
- [ ] Subscription / billing layer

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
17. → **Action menu** — skills as buttons in palette ← **NOW**
18. → Screenshot + Claude Vision
19. → Workflow memory + power features

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
- `supabase.ts` exports three clients: `createServerSupabaseClient` (cookies/SSR), `createUserClient` (Bearer token for Electron), `createAdminClient` (service role, server-only)
- Dashboard pages are fully wired to real Supabase data via the browser client (RLS handles auth); API routes are for the Electron app (Bearer token auth)

---

*Last updated: Phase 1, 2, and Phase 3 write-action layer complete. Entire web app live on Vercel. Electron app fully functional — tray, hotkey, login, context detection, SSE streaming, and all 5 write actions (`insert_text`, `copy_to_clipboard`, `open_folder`, `open_file`, `open_url`). Assembler updated with explicit capabilities/limitations prompt. UI polish: palette opacity, Inter font, scrollbar, footer visibility all fixed. Next: action menu — surface skills as buttons in the palette.*
