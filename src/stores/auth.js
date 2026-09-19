import { reactive, computed } from 'vue'
import { api, configureAuth } from '../api/client'

const KEY = 'dssoc.session'

// Tokens live 15 minutes. sessionStorage keeps a page refresh from logging the
// user out, without leaving the token behind after the tab closes.
function load() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    return session.exp * 1000 > Date.now() ? session : null
  } catch {
    return null
  }
}

// Decodes token into JSON-appropriate string
function claims(token) {
  const [, payload] = token.split('.')
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
}

const state = reactive({ session: load() })

export const auth = {
  state,
  isAuthenticated: computed(() => !!state.session && state.session.exp * 1000 > Date.now()),
  username: computed(() => state.session?.username ?? ''),
  permissions: computed(() => state.session?.permissions ?? []),
  member: computed(() => state?.session?.member ?? null),
  isLinkedMember: computed(() => !!state?.session?.hasMemberId),

  can(...needed) {
    const held = state.session?.permissions ?? []
    return needed.some((p) => held.includes(p))
  },

  async login(username, password) {
    const res = await api.authenticate(username, password)
    const payload = claims(res.access_token)
    state.session = {
      token: res.access_token,
      username: res.user?.username ?? payload.sub,
      member: res?.user?.member ?? null,
      hasMemberId: res?.user?.has_member_id ?? false,
      permissions: payload.permissions ?? [],
      exp: payload.exp
    }
    sessionStorage.setItem(KEY, JSON.stringify(state.session))
  },

  async logout() {
    try {
      if (state.session) await api.logout()
    } catch {
      // The token is discarded locally regardless of what the server says.
    } finally {
      auth.clear()
    }
  },

  updateMember(updatedMember) {
    if (!state.session) return
    state.session.member = updatedMember
      ? { ...(state.session.member ?? {}), ...updatedMember }
      : state.session.member
    sessionStorage.setItem(KEY, JSON.stringify(state.session))
  },

  clear() {
    state.session = null
    sessionStorage.removeItem(KEY)
  }
}

configureAuth({
  tokenGetter: () => (auth.isAuthenticated.value ? state.session.token : null),
  unauthorizedHandler: () => auth.clear()
})
