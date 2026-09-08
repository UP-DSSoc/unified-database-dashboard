# DSSOC Membership Dashboard

Vue 3 + D3 read-only front end for the Unified DB API. Standalone repo — no shared
imports with `dssoc-unifieddb`.

```bash
cp .env.example .env      # set VITE_API_BASE_URL
npm install
npm run dev
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

## Notes on the API, for the backend side

1. **`GET /reaffiliations` cannot back a named list.** The `Reaffiliation` response model
   has no `dssoc_id` and no name fields, so the rows come back anonymous. This dashboard
   uses `GET /members?year&sem` instead. If you want the list page to show designation or
   committee alongside the name, `GET /members` needs a `$lookup` into
   `fact_reaffiliation`, or `Reaffiliation` needs `dssoc_id` plus a member join.
2. **`classification_by_semester` is not scoped.** Its pipeline has no `$match`, so it
   groups every document in `fact_reaffiliation` across all years and ignores
   `is_deleted`. It is deliberately not charted here — adding `{"$match": year_match}`
   would make it usable.
3. **`comm_id = Optional[str]` in `fetch_reaffiliations`** is an assignment, not an
   annotation, so the default value is the typing object itself. It should be
   `comm_id: Optional[str] = None`.
4. **`total_by_semester` includes deferrals**, since its pipeline has no designation
   filter. The headline count is therefore "records for the semester", and deferrals are
   shown separately rather than subtracted.
5. `GET /members` filters on `year` + `semester`, while `GET /reaffiliations` filters on a
   `dssoc_id` regex — the two paths can diverge for members whose `dssoc_id` prefix does
   not match their reaffiliation semester.
