# Skill: AAAI+ Dashboard

When this skill is invoked, load full context about the Project AAAI+ credit rating dashboard and continue building on it.

## Context

- **File:** `C:/Users/User/credit-rating-ai/dashboard.html` (single-file HTML/CSS/JS app)
- **Repo:** https://github.com/bhagyam007/credit-rating-ai
- **Live URL:** https://bhagyam007.github.io/credit-rating-ai/
- **Stack:** Vanilla HTML/CSS/JS, Chart.js, localStorage, Google News RSS, Screener.in, Claude API fallback

## Tabs / Sections

| Tab | ID | Notes |
|---|---|---|
| Portfolio Overview | `tab-overview` | Charts + Edit Portfolio + Planning |
| Material Event Checker | `tab-material-event` | Check/log events |
| Rating Note Generator | `tab-rating-note` | — |
| News Summary | `tab-news-summary` | Auto-refresh on click; 4-col table; Claude AI fallback |
| AI Rating Model | `tab-ai-model` | Scoring engine |

## Data (localStorage keys)
- `portfolio_data` — array of `{ company, rating, screenerSymbol, screenerDate }`
- `rn_history` — rating note history
- `am_history` — AI model history
- `pp_info_status` — portfolio planning info status per company
- `claude_api_key` — Claude API key for news fallback

## Key functions to know
- `fetchNewsTable(force)` — fetches Google News for all portfolio companies
- `fetchScreenerDate()` — scrapes Screener.in for annual report date
- `renderTable()` — re-renders Edit Portfolio table
- `renderSurveillanceDue()` — re-renders Portfolio Planning surveillance table
- `initOverviewCharts()` — redraws all Chart.js charts
- `buildDraftMail(company, headline)` — generates client clarification email draft
- `sendMailToClient(idx)` — opens draft mail modal + mailto link
- `runClaudeNewsFetch()` — Claude API fallback for news

## Rules for building on this
1. All code stays inline in `dashboard.html` — no separate files
2. Always read the relevant section before editing
3. Compact bullet summaries after changes
4. Don't add fields/features beyond what's asked
5. After changes: `cd C:/Users/User/credit-rating-ai && git add dashboard.html && git commit -m "..." && git push`
