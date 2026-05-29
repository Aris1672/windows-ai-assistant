# Windows AI Assistant — Project Status

## Project Overview

A Windows desktop AI assistant that helps users while they work on their computer. The assistant is general-purpose with support for custom user instructions, fully multilingual with automatic language detection, and designed to work in regions with internet restrictions (e.g. Russia) by routing all AI and database calls through Vercel.

---

## Core Concept

- A lightweight Windows app (system tray + global hotkey overlay)
- Helps users with tasks in any app or context on their screen
- Works out of the box for anyone, with optional custom instructions per user
- Multilingual — detects the user's language automatically and responds in kind
- Cloud-based AI via a secure Vercel proxy (no direct API calls from the client)

---

## Architecture

```
Windows App (Electron + React + TypeScript)
              ↓ HTTPS
    Vercel (Next.js API Routes)       ← secure middleman
       ↙                 ↘
Anthropic Claude API     Supabase
(AI responses)           (users, settings, history)
```

All API keys are stored on Vercel — never exposed in the desktop app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Windows App | Electron + React + TypeScript |
| Backend / Proxy | Next.js on Vercel |
| Database & Auth | Supabase |
| AI Model | Anthropic Claude API |
| Multilingual UI | i18next (follows OS locale) |
| Source Control | GitHub |
| CI/CD | GitHub → Vercel (auto-deploy) |

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
                     Uses AI assistant
```

---

## Vercel Web App — Pages & Routes

| Route | Purpose | Who |
|---|---|---|
| `/` | Landing page — marketing, features, download | Public |
| `/register` | Create new account | Public |
| `/login` | Log in (also used by desktop app) | Users |
| `/dashboard` | Personal user area | Users |
| `/dashboard/settings` | Custom prompt, preferences | Users |
| `/dashboard/history` | Conversation history | Users |
| `/dashboard/billing` | Subscription (future) | Users |
| `/admin` | Admin dashboard | Administrator |
| `/admin/users` | View and manage all users | Administrator |
| `/admin/analytics` | Usage stats | Administrator |
| `/admin/settings` | Global app configuration | Administrator |
| `/api/chat` | Claude proxy route | Internal |
| `/api/user` | User data from Supabase | Internal |

---

## Supabase Schema (Initial)

| Table | Purpose |
|---|---|
| `users` | Auth, profile, subscription tier |
| `settings` | Custom system prompt per user, UI preferences |
| `conversations` | Conversation history per user |
| `messages` | Individual messages per conversation |

Row Level Security (RLS) ensures users can only access their own data. Admin role bypasses RLS.

---

## Multilingual Strategy

- Claude detects the user's language automatically and responds in the same language
- System prompt instruction: *"Detect the language of the user's message and always respond in that same language."*
- UI language (buttons, menus) follows the OS locale via `i18next`
- Users can write their custom instruction in their own language

---

## User Roles

| Role | Access |
|---|---|
| User | Own data only (enforced by Supabase RLS) |
| Administrator | Full access to all data and admin panel |

---

## What Still Needs Building

### Phase 1 — Foundation
- [ ] GitHub repository setup (monorepo: `/app`, `/web`, `/api`)
- [ ] Supabase project setup (auth, tables, RLS policies)
- [ ] Vercel project setup + environment variables
- [ ] `/api/chat` — Claude proxy route on Vercel
- [ ] `/api/user` — user data route on Vercel

### Phase 2 — Web (Vercel / Next.js)
- [ ] `/register` page — new user sign up (Supabase Auth)
- [ ] `/login` page — user login
- [ ] `/dashboard` — user home area
- [ ] `/dashboard/settings` — custom system prompt input
- [ ] `/dashboard/history` — conversation history view
- [ ] `/admin` — admin panel with login protection
- [ ] Landing page `/` — marketing, features, download button

### Phase 3 — Windows App (Electron)
- [ ] Electron shell setup (React + TypeScript)
- [ ] Login screen (calls Vercel `/api/login`, stores token)
- [ ] Global hotkey — summons overlay from anywhere
- [ ] Chat overlay UI — minimal, fast, always on top
- [ ] Custom system prompt — fetched from Supabase via Vercel
- [ ] Multilingual UI with `i18next`
- [ ] Auto-updater (`electron-updater`)
- [ ] Windows installer (`.exe`) packaging

### Phase 4 — Power Features
- [ ] Pre-built persona templates (Developer, Writer, Student, etc.)
- [ ] Screen context awareness (screenshot → Claude Vision)
- [ ] Conversation history synced to Supabase
- [ ] Usage analytics in admin panel
- [ ] Subscription / billing layer (future)

---

## Build Order (Recommended)

1. Supabase — auth + tables + RLS
2. Vercel `/api/chat` + `/api/user` routes
3. `/register` + `/login` web pages
4. Electron app — login + chat overlay
5. `/dashboard/settings` — custom prompt
6. Landing page
7. Admin panel
8. Power features

---

## Notes

- The Vercel proxy is the key architectural decision — it enables access in restricted regions and keeps all secrets server-side
- The Windows app registers users via the web only; the app handles login only
- Claude handles multilingual detection natively — no extra libraries needed for AI responses
- Start with Electron for speed; consider migrating the shell to Tauri later if performance becomes a concern

---

*Last updated: project kickoff*
