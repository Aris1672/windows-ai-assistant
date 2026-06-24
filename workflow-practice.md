# 🧪 Practice: AI Learns Your Workflow

Use this document to simulate a repeating workflow and trigger the pattern detection feature.

---

## 🎯 The Workflow You're Practising

**Scenario:** You're a sales manager who reviews weekly numbers and writes a short email summary.

**Pattern to repeat (do this 3–4 times across different palette sessions):**
1. Select the sales table below → Copy (Ctrl+C)
2. Open the palette (Ctrl+Space)
3. Type one of the practice queries
4. Let it complete

---

## 📊 Sample Sales Data (select all → Ctrl+C, then open palette)

```
Weekly Sales Report — Week 24, 2026

Region          | Mon   | Tue   | Wed   | Thu   | Fri   | TOTAL
----------------|-------|-------|-------|-------|-------|-------
North           | 4,200 | 3,800 | 5,100 | 4,600 | 6,200 | 23,900
South           | 3,100 | 4,400 | 3,900 | 5,200 | 4,800 | 21,400
East            | 5,500 | 5,100 | 4,700 | 5,800 | 7,100 | 28,200
West            | 2,900 | 3,300 | 4,100 | 3,700 | 4,500 | 18,500
----------------|-------|-------|-------|-------|-------|-------
TOTAL           |15,700 |16,600 |17,800 |19,300 |22,600 | 92,000

Top product: Enterprise licences (+18% vs last week)
Worst region:  West (−6% vs last week)
```

---

## 💬 Practice Queries (rotate through these — use a different one each session)

| Session | Query to type in the palette |
|---------|------------------------------|
| 1 | `Summarise these sales numbers into a short email report` |
| 2 | `Write a weekly sales summary email from this data` |
| 3 | `Create a brief report of this week's sales performance` |
| 4 | `Turn these figures into an executive summary email` |

---

## 🔁 How to Run Each Session

1. **Select** the sales table above (click start → Shift+click end)
2. **Copy** with Ctrl+C
3. **Open palette** with Ctrl+Space
4. **Type** the query for that session (see table above)
5. **Wait** for the response to complete
6. **Close** the palette
7. *(Optional: wait a few minutes, then repeat with the next query)*

---

## ✅ Checklist — When Will the Banner Appear?

- [ ] 5+ completed actions in Supabase (`actions` table, `status = completed`)
- [ ] At least 2–3 of them are the same type of task (sales summary)
- [ ] Palette opened **after** the 1-hour cache expires (or cache was set to 1 min for testing)
- [ ] Sonnet returns confidence ≥ 0.75

**Expected banner text:**
> *"I noticed you often create weekly sales reports. Create a skill?"*

---

## 🛠 Debugging Tips

**Check if actions are being saved:**
Go to Supabase → Table Editor → `actions` table → filter by your user ID → look for `status = completed` rows.

**Speed up testing (dev only):**
In `CommandPalette.tsx`, find `60 * 60 * 1000` (1-hour cache) and temporarily change to `60 * 1000` (1 minute). Revert before release.

**Force a fresh pattern check:**
Restart the Electron app — this clears the in-memory cache and the next palette open will call the endpoint immediately.
