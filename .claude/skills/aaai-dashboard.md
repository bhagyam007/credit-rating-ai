# Skill: Project AAAI+

When this skill is invoked, load full context about the Project AAAI+ credit rating app and continue building on it.

## Files

| File | Live URL | Purpose |
|---|---|---|
| `dashboard.html` | https://bhagyam007.github.io/credit-rating-ai/ | Main surveillance dashboard |
| `internal-rating-model.html` | https://credit-rating-ai.vercel.app/internal-rating-model | Login + Rating Model app |

- **Repo:** https://github.com/bhagyam007/credit-rating-ai
- **Stack:** Vanilla HTML/CSS/JS, Chart.js, localStorage, Google News RSS, Screener.in, Claude API
- **Deploy:** `npx vercel --prod` — Vercel auto-deploy is NOT wired up; manual deploy required every time

---

## dashboard.html

| Tab | ID |
|---|---|
| Portfolio Overview | `tab-overview` |
| Material Event Checker | `tab-material-event` |
| Rating Note Generator | `tab-rating-note` |
| News Summary | `tab-news-summary` |
| AI Rating Model | `tab-ai-model` |

**localStorage:** `portfolio_data`, `rn_history`, `am_history`, `pp_info_status`, `claude_api_key`

**Key functions:** `fetchNewsTable(force)`, `fetchScreenerDate()`, `renderTable()`, `renderSurveillanceDue()`, `initOverviewCharts()`, `buildDraftMail()`, `sendMailToClient(idx)`, `runClaudeNewsFetch()`

---

## internal-rating-model.html

### Login screen (full-page overlay)
- Left: "Project AAAI+" centred, cyan glow pulse, 19 teal floating rating badges, credits ("Conceptualized by Samyuktha R / Powered by Claude"), teal `+` cursor
- Right: Login (username/password) | Register | Try Demo (bypasses auth)
- Auth: `localStorage` key `aaai_users` → `[{ name, username, password }]`

### Sidebar nav
Portfolio Overview → Edit Portfolio | Rating Set Up | Model Set Up | Rating Request | Rating Report | Peer Group Analysis | AI Assistant

### Portfolio / Edit Portfolio panel
- Add Company: name + PR date → Save
- List of Cases: No. | Company Name (sortable) | Surveillance Due (PR+12mo) | Info Received (toggle) | Draft Info Req. Mail (modal: Initial/Reminder → mailto) | Draft INC Mail (mailto)
- `localStorage` key `irm_portfolio_cases` → `[{ name, prDate, infoReceived }]`

### Key functions
`enterApp()`, `tryDemo()`, `doLogin()`, `doRegister()`, `hideAllPanels()`, `selectPortfolio()`, `selectAI()`, `addCase()`, `renderCasesTable()`, `sortCases(field)`, `toggleInfoReceived(idx)`, `openMailModal(idx)`, `draftInfoMail(idx, type)`, `draftINCMail(idx)`

---

## Rules
1. Code stays inline in the HTML file — no separate files
2. Read the relevant section before editing
3. Don't add beyond what's asked
4. After changes: `git add <file> && git commit -m "..." && git push && npx vercel --prod`
