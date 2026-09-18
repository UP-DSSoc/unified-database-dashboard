const BASE = (import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '')
const BYPASS = import.meta.env.VITE_VERCEL_BYPASS

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

// Set by the auth store so the client stays free of store imports (no cycle).
let getToken = () => null
let onUnauthorized = () => {}
export function configureAuth({ tokenGetter, unauthorizedHandler }) {
  getToken = tokenGetter
  onUnauthorized = unauthorizedHandler
}

async function request(
  path, 
  { method = 'GET', body, auth = true, params } = {}
) {
  const url = new URL(BASE + path)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
    }
  }

  // NOTE: Read this section on header request
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  if (BYPASS) headers['x-vercel-protection-bypass'] = BYPASS
  if (auth) {
    const token = getToken()
    if (!token) {
      onUnauthorized()
      throw new ApiError(401, 'Your session ended. Sign in again.')
    }
    headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError(0, 'Cannot reach the API. Check the connection and try again.')
  }

  if (res.status === 204) return null

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    // FastAPI returns {"detail": "..."} — 422 returns a list of field errors.
    const detail = Array.isArray(payload.detail)
      ? payload.detail.map((d) => d.msg).join('; ')
      : payload.detail
    if (res.status === 401 && auth) onUnauthorized()
    throw new ApiError(res.status, detail || defaultMessage(res.status))
  }
  return payload
}

function defaultMessage(status) {
  switch (status) {
    case 401: return 'Your session ended. Sign in again.'
    case 403: return 'Your account does not have access to this data.'
    case 404: return 'Nothing found for that request.'
    case 429: return 'Too many requests. Wait a minute, then retry.'
    case 503: return 'The database is unavailable right now. Try again shortly.'
    default: return 'Something went wrong on the server.'
  }
}

export const api = {
  // POST /authenticate -> { access_token, token_type, user }
  authenticate: (username, password) =>
    request('/authenticate', { method: 'POST', auth: false, body: { username, password } }),

  // POST /logout — revokes the token's jti server-side.
  logout: () => request('/logout', { method: 'POST' }),

  // GET /meta/semesters -> { data: [{ year, semester }], total }
  semesters: () => request('/meta/semesters', { auth: false }),

  // GET /reaffiliations/{YYYY[AB]}/summary -> ReaffiliationAnalytics
  // Requires read:all or read:reaff.
  getReaffiliationsSummary: (fullSemester) => request(`/reaffiliations/${fullSemester}/summary`),

  // GET /members?year&sem&page -> PaginatedMembers
  // The one endpoint carrying member names; /reaffiliations returns fact rows only.
  // Requires read:all or read:member.
  members: ({ year, sem, page = 1 }) => request('/members', { params: { year, sem, page } }),

  getCampusDegreePrograms: (campus_id, page = 1) => request(`/campus/${campus_id}/degrees`, { params: { page }}),

  // GET /reaffiliations
  getReaffiliations: ({ year, sem, campus_id = null, comm_id = null, include_member_data = false, page = 1}) => 
    request('/reaffiliations', { params: { year, sem, campus_id, comm_id, include_member_data, page } }),
  deleteReaffiliation: ( id ) => request(`/reaffiliations/reaff/${id}`, { method: 'DELETE' }, )
}

export const semesterCode = (year, semester) => `${year}${semester}`

// Latest = highest academic year, then B after A.
export function latestSemester(entries) {
  return [...entries].sort(
    (a, b) => b.year - a.year || b.semester.localeCompare(a.semester)
  )[0]
}
