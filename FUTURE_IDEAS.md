# Windows AI Assistant — Future Ideas

> Ideas backlog for features beyond v0.6.4. Grouped by theme and rough impact/effort.

---

## 🔥 High Impact — Close to What's Already There

### 1. Stripe Integration
Replace manual billing with a proper payment flow.
- Stripe Checkout for subscription signup
- Webhook to flip `subscription_status` in Supabase on payment
- Auto-renewal without admin intervention
- **Why now:** Manual billing won't scale past beta.

### 2. Keyboard Shortcuts for Skills
`Ctrl+1`, `Ctrl+2`, `Ctrl+3` etc. to trigger the top skill buttons instantly.
- Skills already rendered as buttons — just add keyboard listener
- Show shortcut hint on hover
- **Why:** Power users want zero mouse interaction.

### 3. Recent Queries in Idle State
Show the last 3–5 queries below the context hint when the palette opens idle.
- One click to re-run any previous query
- Stored locally in `store.ts`
- Disappears the moment user starts typing
- **Why:** Most users repeat the same 5–10 tasks daily.

### 4. Attach File Button (📎)
Instead of typing `Summarise report.pdf`, click the attach button to open a native Windows file picker.
- Drag & drop won't work — the palette dismisses on blur the moment the user starts dragging from Explorer
- Native `dialog.showOpenDialog` in Electron opens a file picker without losing palette focus
- File is read via the existing `file-reader.ts` and injected as a `fileRef` — reuses the full existing pipeline
- A small filename chip appears in the palette confirming the attachment (like the existing file search indicator)
- User types their query normally — file content is already in context
- **Why:** Faster than typing filenames; works for users who don't remember exact names; trusted Windows pattern. -> **DONE**

### 5. Pin a Response
Let the user pin an AI response so it stays visible as a floating note while working in another app. 
- Small "pin" icon on any AI response
- Opens a minimal always-on-top window with the pinned text
- User can copy from it at any time
- **Why:** Users often need to reference AI output while typing in a different app.

---

## ⚡ Medium Impact — Unique to This Product

### 6. Tray Right-Click Quick Actions
Run the 3 most-used skills directly from the system tray menu, without opening the palette.
- Right-click tray icon → skill list → executes + copies result
- Skills pulled from the same Supabase skills table
- **Why:** Fastest possible trigger for repetitive tasks — no window needed.

### 7. Custom Hotkey
Let users change `Ctrl+Space` to a different key combination in Settings.
- Some apps (e.g. VS Code, input methods) conflict with `Ctrl+Space`
- Stored in `store.ts`, applied in `hotkey.ts`
- **Why:** Removes the #1 friction point for users in conflicting environments.

### 8. Voice Input
Speak the query instead of typing — one microphone button in the palette.
- Use Web Speech API (available in Electron renderer) or Whisper API
- Transcribed text fills the input field; user can edit before submitting
- **Why:** Big for users who dictate; also useful when hands are occupied.

### 9. Scheduled Skills
Run a skill automatically on a schedule, e.g. every morning: "Summarise my overnight emails."
- User sets a skill + schedule (daily, weekdays, custom time) in Dashboard
- Main process fires the skill at the scheduled time via `node-cron`
- Result delivered as a Windows notification with a "view" action
- **Why:** Turns the tool from reactive to proactive — a fundamentally different value tier.

---

## 📈 Business & Retention

### 10. Usage Widget in Palette
Tiny token/quota indicator at the bottom of the palette showing monthly usage.
- E.g. `▓▓▓▓▓░░░░░ 52% used this month`
- Pulled from `tokens_used_this_month` already tracked in Supabase
- **Why:** Increases perceived value — users see they're getting real usage out of their subscription.

### 11. Referral System
"Invite a friend, get 7 free days" — both referrer and referee benefit.
- Unique referral link generated per user in Dashboard
- On signup via referral link: extend both users' `subscription_ends_at` by 7 days
- Track in a new `referrals` table
- **Why:** Low cost to build, organic acquisition, rewards loyal beta users.

---

## Priority Order (suggested)

| # | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Stripe integration | Medium | 🔴 Critical |
| 2 | Recent queries in idle state | Low | 🟠 High |
| 3 | Keyboard shortcuts for skills | Low | 🟠 High |
| 4 | Custom hotkey | Low | 🟠 High |
| 5 | Attach file button (📎) | Low | 🟠 High |
| 6 | Usage widget in palette | Low | 🟡 Medium |
| 7 | Tray right-click quick actions | Medium | 🟡 Medium |
| 8 | Referral system | Medium | 🟡 Medium |
| 9 | Pin a response | Medium | 🟡 Medium |
| 10 | Voice input | High | 🟡 Medium |
| 11 | Scheduled skills | High | 🟢 High (long term) |

---

*Last updated: v0.6.4. All features above are post-beta ideas — nothing here is committed.*
