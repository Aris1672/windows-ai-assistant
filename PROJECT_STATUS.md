# Windows AI Assistant — Project Status

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

The product is built around three clean, distinct layers. Users understand all three intuitively. The complexity is hidden under the hood.

---

### Layer 1 — Core AI Engine

Always-on, built-in capabilities every user gets out of the box. No configuration required.

- Understand screen context (active app, selected text, file path)
- Summarize content
- Rewrite and translate text
- Search and find files
- Answer questions
- Execute automations

This is the foundation. It works on day one with zero setup.

---

### Layer 2 — User Instructions

Persistent behavioural rules the user configures once. These are always active and shape how the AI behaves across everything it does.

Examples:
- "Keep responses short"
- "Use Dutch for translations"
- "Never auto-send emails"
- "Prefer formal tone"
- "Always extract vendor name, date, and amount from invoices"

**Configured as structured settings** — toggles, preferences, and templates. Users never write raw prompts unless they explicitly choose to (optional advanced field for power users).

**Context conditions (optional):** Any instruction can be scoped to activate only when a specific app is in focus or a specific folder is active. This is exposed as a simple "only when [app/folder] is active" toggle — not as a complex hierarchy.

---

### Layer 3 — Skills

Reusable named actions the user builds, picks from templates, or installs. Skills appear in the command palette and are triggered manually by the user.

Examples:
- "Prepare meeting summary"
- "Clean Downloads folder"
- "Create Jira ticket from selected text"
- "Rename scanned invoices"
- "Generate polite customer response"

**Context-aware surfacing:** Skills are automatically shown or hidden based on the current context (active app, folder, selected content). If you're in Excel, Excel-relevant skills surface. In an invoice folder, invoice skills appear. Users don't manage this — it just works.

**Skills ≠ Instructions.** Instructions shape behaviour. Skills are triggered actions.

---

## The User Mental Model

```
Layer 1  →  Built-in abilities         (always works, zero setup)
Layer 2  →  My preferences & rules     (feels personal, always active)
Layer 3  →  My saved actions           (context-aware, triggered on demand)
```

---

## Strategic Moat

Skills and Instructions create a **compounding product**. Every configuration a user adds makes the assistant more useful AND harder to leave:

```
Day 1:    Install → works immediately out of the box
Week 1:   Set tone and language preferences (Layer 2)
Month 1:  Add invoice extraction rule + folder condition
Month 3:  Build support ticket and meeting summary skills
Month 6:  The assistant knows their entire working life
```

Switching to a competitor means rebuilding everything. The AI is the engine — the instructions and skills are the product.

---

## Action Safety Model

| Action Type | Examples | Behaviour |
|---|---|---|
| **Read-only** | Summarize, explain, rewrite, translate | Execute immediately |
| **Write / Destructive** | Move files, edit documents, send email | Always show confirmation first |

The user is always in control. The AI suggests and executes — but never without permission for irreversible actions.

---

## Context Awareness (How It Works)

When `Ctrl + Space` is triggered, the Electron app captures:

1. **Active application** — what program is in focus (Word, VS Code, Excel, browser, etc.)
2. **Active file / folder path** — used to match context conditions on Skills and Instructions
3. **Selected text** — any text the user has highlighted
4. **Screenshot (optional, Phase 4)** — sent to Claude Vision for deeper understanding
5. **Assembled instruction + skill context** — fetched from Supabase, merged by Vercel

This context bundle is sent to the Vercel `/api/context` route, which assembles the right instructions and skills and forwards to Claude.

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

All API keys are stored on Vercel — never exposed in the desktop app.
Users in restricted regions (e.g. Russia) call the Vercel endpoint — not Anthropic or Supabase directly.

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

| Table | Purpose |
|---|---|
| `users` | Auth, profile, subscription tier |
| `instructions` | Layer 2 rules per user, with optional context conditions |
| `skills` | Layer 3 saved actions per user, with context-matching rules |
| `skill_steps` | Individual steps / sub-actions within a skill |
| `actions` | Log of every action taken (for history + workflow learning) |
| `conversations` | Full conversation history per user |
| `messages` | Individual messages per conversation |

Row Level Security (RLS) ensures users can only access their own data. Admin role bypasses RLS.

### `instructions` Table Structure
```
id
user_id
label             (short user-facing name, e.g. "Formal tone")
instruction_text  (the actual rule sent to Claude)
context_app       (optional — e.g. "Microsoft Excel"; null = always active)
context_folder    (optional — e.g. "C:/Work/Invoices"; null = always active)
is_active         (boolean)
created_at
updated_at
```

### `skills` Table Structure
```
id
user_id
name              (e.g. "Prepare meeting summary")
description       (shown in command palette)
steps             (JSON — ordered list of actions/prompts)
context_app       (optional — only surface when this app is active)
context_folder    (optional — only surface in this folder)
is_active         (boolean)
created_at
updated_at
```

---

## Multilingual Strategy

- Claude detects the user's language automatically and responds in the same language
- System prompt instruction: *"Detect the language of the user's message and always respond in that same language."*
- UI language (buttons, menus) follows the OS locale via `i18next`
- Users can configure instructions and skills in their own language
- Action labels in the command palette adapt to the UI language

---

## User Flow

```
New user finds app → Landing Page
                          ↓
                     Registers account (/register)
                          ↓
                     Verifies email (Supabase Auth)
                          ↓
                     Downloads Windows app
                          ↓
                     Opens app → Logs in
                          ↓
                  App sits silently in system tray
                          ↓
            User hits Ctrl + Space from any application
                          ↓
         App detects context (active app, folder, selected text)
                          ↓
         Vercel assembles instructions + surfaces matching skills
                          ↓
              Command palette appears with context actions
                          ↓
                  User selects or types an action
                          ↓
             Read-only → execute immediately
             Write/destructive → show confirmation first
                          ↓
                    AI responds / executes
```

---

## Vercel Web App — Pages & Routes

| Route | Purpose | Who |
|---|---|---|
| `/` | Landing page — marketing, features, download | Public |
| `/register` | Create new account | Public |
| `/login` | Log in (also used by desktop app) | Users |
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
| `/api/context` | Receives context bundle, assembles instructions + skills, calls Claude | Internal |
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
- [ ] Supabase project setup (auth, tables, RLS policies)
- [ ] Vercel project setup + environment variables
- [ ] `/api/chat` — Claude proxy route on Vercel
- [ ] `/api/context` — context bundle receiver + instruction/skill assembler
- [ ] `/api/instructions` — CRUD for user instructions
- [ ] `/api/skills` — CRUD for user skills
- [ ] `/api/user` — user data route on Vercel

### Phase 2 — Web (Vercel / Next.js)
- [ ] `/register` page — new user sign up (Supabase Auth)
- [ ] `/login` page — user login
- [ ] `/dashboard` — user home area
- [ ] `/dashboard/instructions` — instruction manager (structured settings UI)
- [ ] `/dashboard/instructions/new` — instruction creator with optional context conditions
- [ ] `/dashboard/skills` — skill manager
- [ ] `/dashboard/skills/new` — skill builder with context-matching options
- [ ] `/dashboard/history` — action history view
- [ ] `/admin` — admin panel with login protection
- [ ] Landing page `/` — marketing, features, download button

### Phase 3 — Windows App (Electron) — CORE PRODUCT
- [ ] Electron shell setup (React + TypeScript)
- [ ] Login screen (calls Vercel `/api/login`, stores token)
- [ ] System tray icon — app runs silently in background
- [ ] Global hotkey `Ctrl + Space` — triggers overlay from anywhere
- [ ] Command palette overlay UI — fast, minimal, always on top
- [ ] Active window detection — knows what app is in focus
- [ ] Active file / folder path detection — matches context conditions
- [ ] Selected text capture — reads what the user has highlighted
- [ ] Context bundle — packages all context and sends to Vercel
- [ ] Instruction + skill assembler call — Vercel returns assembled context
- [ ] Action menu — context-aware skills rendered in palette
- [ ] Confirmation step — for write/destructive actions
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

1. Supabase — auth + tables (`users`, `instructions`, `skills`, `skill_steps`, `actions`) + RLS
2. Vercel `/api/context` — instruction + skill assembler (the brain of the system)
3. Vercel `/api/instructions` + `/api/skills` + `/api/user` — data routes
4. `/register` + `/login` web pages
5. `/dashboard/instructions` + `/dashboard/skills` — manager UIs
6. Electron shell — system tray + global hotkey
7. Command palette overlay UI
8. Context detection (active window + folder path + selected text)
9. Landing page
10. Admin panel
11. Screenshot + Claude Vision
12. Workflow memory + power features

---

## Notes

- The Vercel proxy is the key architectural decision — enables access in restricted regions, keeps all secrets server-side
- The Windows app registers users via the web only; the app handles login only
- Claude handles multilingual detection natively — no extra libraries needed for AI responses
- **The command palette IS the product** — chat is secondary
- **Layer 2 instructions + Layer 3 skills ARE the moat** — the product gets more valuable with every addition
- Never expose users to raw prompt editing unless they explicitly choose it (optional advanced field)
- Read-only actions execute immediately; write/destructive actions always require confirmation
- The instruction + skill assembler on Vercel is the most critical backend function
- Context-switching is invisible infrastructure — users never think in terms of "scopes"

---

*Last updated: Architecture revised to three-layer model (Core Engine / Instructions / Skills). Context-switching preserved as invisible infrastructure within Layer 2 and 3 context conditions.*
