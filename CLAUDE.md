# Project AAAI+ — Credit Rating Surveillance Dashboard

## Overview
Two-file HTML/CSS/JS app for credit rating surveillance.

- **Repo:** https://github.com/bhagyam007/credit-rating-ai
- **Stack:** Vanilla HTML/CSS/JS, Chart.js, localStorage, Google News RSS, Screener.in, Claude API
- **Deploy:** `npx vercel --prod` from `C:/Users/User/credit-rating-ai` — Vercel auto-deploy is NOT connected, must deploy manually every time

## Files

| File | Live URL | Purpose |
|---|---|---|
| `dashboard.html` | https://bhagyam007.github.io/credit-rating-ai/ | Main surveillance dashboard |
| `internal-rating-model.html` | https://credit-rating-ai.vercel.app/internal-rating-model | Project AAAI+ app (login + rating model) |

---

## dashboard.html — Tabs

| Tab | ID |
|---|---|
| Portfolio Overview | `tab-overview` |
| Material Event Checker | `tab-material-event` |
| Rating Note Generator | `tab-rating-note` |
| News Summary | `tab-news-summary` |
| AI Rating Model | `tab-ai-model` |

## dashboard.html — localStorage Keys
- `portfolio_data` — array of `{ company, rating, screenerSymbol, screenerDate }`
- `rn_history` — rating note history
- `am_history` — AI model history
- `pp_info_status` — portfolio planning info status per company
- `claude_api_key` — Claude API key for news fallback

## dashboard.html — Key Functions
- `fetchNewsTable(force)` — fetches Google News for all portfolio companies
- `fetchScreenerDate()` — scrapes Screener.in for annual report date
- `renderTable()` — re-renders Edit Portfolio table
- `renderSurveillanceDue()` — re-renders Portfolio Planning surveillance table
- `initOverviewCharts()` — redraws all Chart.js charts
- `buildDraftMail(company, headline)` — generates client clarification email draft
- `sendMailToClient(idx)` — opens draft mail modal + mailto link
- `runClaudeNewsFetch()` — Claude API fallback for news

---

## internal-rating-model.html — Structure
Single-file app. Sidebar nav + main content. Title: "Project AAAI+".

### Login Screen (full-page overlay shown first)
- **Left panel:** "Project AAAI+" centred with cyan glow pulse; 19 floating teal rating badges (AAA/AA/A/BBB variants); credits: "Conceptualized by Samyuktha R / Powered by Claude"; teal `+` custom cursor site-wide
- **Right panel:** Login form (username + password + forgot password link) | Register form (name + username + password) | "Try Demo" button (bypasses auth)
- Auth stored in `localStorage` key `aaai_users` → `[{ name, username, password }]`
- `enterApp()` fades out the overlay; `tryDemo()` calls it directly

### Sidebar Sections
- **Portfolio Overview** → Edit Portfolio (custom panel)
- Rating Set Up, Model Set Up, Rating Request, Rating Report, Peer Group Analysis (placeholder panels)
- AI Assistant (chat, calls `/api/chat`)

### Portfolio Overview / Edit Portfolio Panel
- Add Company form: Company Name + Latest PR Date → Save Changes
- **List of Cases** columns: No. | Company Name (sort A-Z / by due) | Surveillance Due (PR + 12 months) | Info Received (Yes/No toggle) | Draft Info Req. Mail | Draft INC Mail
- Info Req. mail button opens modal → Initial Request or Reminder → `mailto:` opens Outlook
- INC mail button goes directly to `mailto:` with INC template
- Data: `localStorage` key `irm_portfolio_cases` → `[{ name, prDate, infoReceived }]`

### Key Functions (internal-rating-model.html)
- `enterApp()` — fades login screen
- `doLogin()` / `doRegister()` / `tryDemo()` — auth flow
- `hideAllPanels()` — hides ai-panel, portfolio-panel, placeholder-panel
- `selectPortfolio(el)` / `selectAI()` / `selectItem(el, section, item)` — nav
- `addCase()` — adds company to portfolio cases
- `renderCasesTable()` — re-renders List of Cases
- `sortCases(field)` — sorts by 'name' or 'due'
- `toggleInfoReceived(idx)` — flips Yes/No
- `openMailModal(idx)` / `closeMailModal()` / `openInfoMail(type)` — info mail flow
- `draftInfoMail(idx, type)` — mailto for initial/reminder
- `draftINCMail(idx)` — mailto for INC notice

---

## Rules
1. All code stays inline in the respective HTML file — no separate JS/CSS files
2. Always read the relevant section before editing
3. Don't add fields/features beyond what's asked
4. After changes to either file: `cd C:/Users/User/credit-rating-ai && git add <file> && git commit -m "..." && git push && npx vercel --prod`
5. `git push` alone does NOT update the Vercel live site — always run `npx vercel --prod` too
