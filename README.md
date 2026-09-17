# DSSOC Membership Dashboard

[![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)

Vue 3 + D3 read-only front end for the Unified DB API. Standalone repo — no shared
imports with `dssoc-unifieddb`.

```bash
cp .env.example .env      # set VITE_API_BASE_URL
npm install
npm run dev
```

```bash
bun install
bun run dev
```

## Pages

| Route             | What it shows                                                        | Permissions               |
|-------------------|----------------------------------------------------------------------|---------------------------|
| `/login`          | Username + password, gated by a router guard on every other route     | none                      |
| `/summary`        | Charts for the latest semester (2425B by default)                     | `read:all` or `read:reaff`|
| `/reaffiliations` | Named list of members who reaffiliated, latest semester by default    | `read:all` or `read:member`|

## API endpoints used

| Call | Used for |
|------|----------|
| `POST /authenticate` | Login. JWT claims (`permissions`, `exp`) are decoded client-side to gate the UI. |
| `POST /logout` | Sign out — lets the server denylist the `jti`. |
| `GET /meta/semesters` | Populates the semester picker and resolves "latest" (highest year, then B over A). Unauthenticated, so it runs before the summary call. |
| `GET /reaffiliations/{YYYY[AB]}/summary` | Every chart on the summary page. |
| `GET /members?year&sem&page` | The reaffiliations list. |

Auth is handled in `src/api/client.js`: the token is attached to every protected call,
and a 401 clears the session so the guard sends the user back to `/login`. Tokens live
in `sessionStorage` (15-minute `exp`, gone when the tab closes).

## Charts (`ReaffiliationAnalytics` → D3)

- `total_by_semester` / `deferrals_by_semester` — headline figure and the across-year delta
- `designation_by_semester` — grouped columns, semester A vs B
- `members_by_committee` — horizontal bars, queried semester only
- `members_by_campus` — donut
- `members_by_year_level` — horizontal bars
- `classification_by_degree_program` — top ten programs

## Roadmaps

1. Minimum Functioning Dashboard
2. Conversion to Vue + TS
3. Distribution of user accounts