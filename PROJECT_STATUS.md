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
| Same for everyone | Personalised via scoped instructions |
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

The AI detects what app is active, what text is selected, and what the user is doing — and offers the right actions for that moment. Chat is available as a secondary mode, not the primary one.

---

## Action Safety Model

| Action Type | Examples | Behaviour |
|---|---|---|
| **Read-only** | Summarize, explain, rewrite, translate | Execute immediately |
| **Write / Destructive** | Move files, edit documents, send email | Always show confirmation first |

The user is always in control. The AI suggests and executes — but never without permission for irreversible actions.

---

## Personalisation — Scoped Instruction Architecture

### The Core Principle
Users do NOT write raw system prompts. Instead, they configure **structured instructions** using toggles, preferences, and templates — with an optional advanced freeform field for power users.

This approach:
- Works for non-technical users immediately
- Produces consistent, predictable AI behaviour
- Is fully debuggable — every instruction that fired is traceable
- Feels like *settings*, not programming

---

### Instruction Layers (Inheritance Model)

Instructions are **scoped and layered**. Each level inherits from the one above and can override it. When `Ctrl + Space` is triggered, the app assembles the most specific instruction set available:

```
Global Instruction          (always active)
    └── App-Level           (only when Excel / Outlook / VS Code / etc. is active)
            └── Folder-Level (only for /invoices, /contracts, /projects, etc.)
                    └── Workflow-Level  (support tickets, meeting notes, code reviews, etc.)
                            └── Advanced (optional freeform field for power users)
```

**Example assembled instruction stack:**
```
Global:    "Keep all responses concise."
App:       "In Excel: explain formulas step by step."
Folder:    "In /invoices: extract vendor name, date, and amount."
Workflow:  "For support tickets: generate polite customer-facing responses."
─────────────────────────────────────────────────────
Claude receives one clean merged system prompt.
```

Claude never sees the complexity — it receives one perfectly assembled instruction set tailored to the exact context.

---

### Structured Settings UI (Not a Prompt Field)

Each scope is configured through a structured panel. Example — Email Assistant:

```
┌─ Outlook Scope Settings ──────────────────────────┐
│                                                    │
│  Tone                                              │
│    ○ Formal   ● Friendly   ○ Concise               │
│                                                    │
│  Always include                                    │
│    ☑ Action items                                  │
│    ☑ Deadlines                                     │
│    ☐ Summary at top                                │
│                                                    │
│  Signature                                         │
│    ☑ Auto-append signature                         │
│                                                    │
│  Advanced Instructions (optional)                  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Only for power users who want full control   │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

Every toggle and preference is translated into clean prompt instructions under the hood. The user never touches raw prompt text unless they choose to.

---

### Scope Manager UI (Dashboard)

```
┌─ My Instruction Scopes ───────────────────────────┐
│                                                    │
│  🌐 Global          "Keep summaries concise"  ✏️  │
│  📊 Excel           "Explain formulas..."     ✏️  │
│  📧 Outlook         "Friendly tone, actions"  ✏️  │
│  📁 /Invoices       "Extract vendor, date..."  ✏️  │
│  🎫 Support tickets "Polite responses..."     ✏️  │
│  📁 /Outlook        [Not configured]          ➕  │
│                                                    │
│  + Add new scope                                   │
└────────────────────────────────────────────────────┘
```

---

### The Strategic Moat

Scoped instructions create a **compounding product**. Every scope a user configures makes the assistant more useful AND harder to leave:

```
Day 1:    Install → set global tone preference
Week 1:   Add Excel scope for formula explanations
Month 1:  Add invoice folder extraction rule
Month 3:  Add support ticket workflow
Month 6:  The assistant knows their entire working life
```

Over time users accumulate workflows, automations, preferences, memory, and custom behaviours. Switching to a competitor means rebuilding everything. The AI is the engine — the scoped instructions are the product.

---

## Context Awareness (How It Works)

When `Ctrl + Space` is triggered, the Electron app captures:

1. **Active application** — what program is in focus (Word, VS Code, Excel, browser, etc.)
2. **Active file / folder path** — used to match folder-level scopes
3. **Selected text** — any text the user has highlighted
4. **Screenshot (optional, Phase 4)** — sent to Claude Vision for deeper understanding
5. **Assembled instruction stack** — fetched from Supabase, merged by Vercel

This context bundle is sent to the Vercel `/api/context` route, which assembles the right scopes and forwards to Claude.

---

## Architecture

```
Windows App (Electron + React + TypeScript)
              ↓ HTTPS  (context bundle)
    Vercel (Next.js API Routes)
       ├── Assembles scoped instruction stack
       ├── Calls Anthropic Claude API
       └── Reads/writes Supabase
           ├── users, settings, scopes
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
| Instruction Assembler | Vercel function — merges scope layers into one prompt |
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
| `scopes` | All instruction scopes per user (global / app / folder / workflow) |
| `scope_settings` | Structured toggle/preference values per scope |
| `actions` | Log of every action taken (for history + workflow learning) |
| `conversations` | Full conversation history per user |
| `messages` | Individual messages per conversation |

Row Level Security (RLS) ensures users can only access their own data. Admin role bypasses RLS.

### `scopes` Table Structure
```
id
user_id
scope_type        (global | app | folder | workflow)
scope_target      (e.g. "Microsoft Excel" | "C:/Work/Invoices" | "support-tickets")
structured_config (JSON — toggles, preferences, template values)
advanced_prompt   (optional freeform text, power users only)
is_active         (boolean)
created_at
updated_at
```

---

## Multilingual Strategy

- Claude detects the user's language automatically and responds in the same language
- System prompt instruction: *"Detect the language of the user's message and always respond in that same language."*
- UI language (buttons, menus) follows the OS locale via `i18next`
- Users can configure scopes in their own language
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
         Vercel assembles scoped instruction stack from Supabase
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
| `/dashboard/scopes` | Scope manager — create and edit all instruction scopes | Users |
| `/dashboard/scopes/new` | Create a new scope | Users |
| `/dashboard/history` | Action & conversation history | Users |
| `/dashboard/billing` | Subscription plan (future) | Users |
| `/admin` | Admin dashboard | Administrator |
| `/admin/users` | View and manage all users | Administrator |
| `/admin/analytics` | Usage stats | Administrator |
| `/admin/settings` | Global app configuration | Administrator |
| `/api/chat` | Claude proxy route | Internal |
| `/api/context` | Receives context bundle, assembles scopes, calls Claude | Internal |
| `/api/user` | User data from Supabase | Internal |
| `/api/scopes` | CRUD for user scopes | Internal |

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
- [ ] `/api/context` — context bundle receiver + scope assembler
- [ ] `/api/scopes` — CRUD for user scopes
- [ ] `/api/user` — user data route on Vercel

### Phase 2 — Web (Vercel / Next.js)
- [ ] `/register` page — new user sign up (Supabase Auth)
- [ ] `/login` page — user login
- [ ] `/dashboard` — user home area
- [ ] `/dashboard/scopes` — scope manager UI (structured settings panels)
- [ ] `/dashboard/scopes/new` — scope creator with app/folder/workflow picker
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
- [ ] Active file / folder path detection — matches folder-level scopes
- [ ] Selected text capture — reads what the user has highlighted
- [ ] Context bundle — packages all context and sends to Vercel
- [ ] Scope assembler call — Vercel merges and returns instruction stack
- [ ] Action menu — context-aware suggestions rendered in palette
- [ ] Confirmation step — for write/destructive actions
- [ ] Multilingual UI with `i18next`
- [ ] Auto-updater (`electron-updater`)
- [ ] Windows installer (`.exe`) packaging

### Phase 4 — Intelligence & Memory
- [ ] Screenshot capture → Claude Vision for deeper context
- [ ] Workflow memory — learns repeated patterns per user
- [ ] Pre-built scope templates (Developer, Writer, Finance, Support, etc.)
- [ ] Action history synced to Supabase
- [ ] Usage analytics in admin panel
- [ ] Subscription / billing layer

---

## Build Order (Recommended)

1. Supabase — auth + tables (`users`, `scopes`, `scope_settings`, `actions`) + RLS
2. Vercel `/api/context` — scope assembler (the brain of the system)
3. Vercel `/api/scopes` + `/api/user` — data routes
4. `/register` + `/login` web pages
5. `/dashboard/scopes` — scope manager UI
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
- **Scoped instructions ARE the moat** — the product gets more valuable with every scope added
- Never expose users to raw prompt editing unless they explicitly choose it
- Read-only actions execute immediately; write/destructive actions always require confirmation
- The instruction assembler on Vercel is the most critical backend function — it determines what Claude knows about the user's context

---

*Last updated: Scoped instruction architecture defined — structured UX, layered context, strategic moat*
