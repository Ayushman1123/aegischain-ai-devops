export interface AuthUser {
  id: string
  name: string
  email: string
  picture: string
}

class AuthApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE_URL = configuredApiBaseUrl ? configuredApiBaseUrl.replace(/\/+$/, '') : ''
const API_BASE_STORAGE_KEY = 'aegischain.api.base'
const TOKEN_STORAGE_KEY = 'aegischain.auth.token'
const USER_STORAGE_KEY = 'aegischain.auth.user'

// Remove stale localhost-based base URLs that break in Codespaces environments
;(function purgeStaleApiBase() {
  const stored = localStorage.getItem(API_BASE_STORAGE_KEY)
  if (stored && (stored.includes('localhost') || /:\d+$/.test(stored))) {
    localStorage.removeItem(API_BASE_STORAGE_KEY)
  }
})()

function normalizeBase(base: string) {
  if (!base) {
    return ''
  }
  return base.replace(/\/+$/, '')
}

function getCodespacesSiblingOrigins() {
  const { protocol, host } = window.location
  const match = host.match(/^(.*)-(\d+)(\..+)$/)
  if (!match) {
    return []
  }

  const [, prefix, activePort, suffix] = match
  const candidatePorts = ['5000', '4173', '4174', '4175', '8787']

  return candidatePorts
    .filter((port) => port !== activePort)
    .map((port) => `${protocol}//${prefix}-${port}${suffix}`)
}

function clearStoredApiBase() {
  localStorage.removeItem(API_BASE_STORAGE_KEY)
}

function getApiBaseCandidates() {
  const candidates = new Set<string>()

  if (API_BASE_URL) {
    candidates.add(normalizeBase(API_BASE_URL))
  }

  // Only use a stored base if it looks like a real external URL (not localhost)
  const stored = localStorage.getItem(API_BASE_STORAGE_KEY)
  if (stored && !stored.includes('localhost') && !stored.match(/:\d+$/)) {
    candidates.add(normalizeBase(stored))
  }

  // Always try same-origin (proxied by Vite) — works in Codespaces and local dev
  candidates.add('')

  // If current page is on a non-proxied Codespaces port, try sibling forwarded ports.
  for (const origin of getCodespacesSiblingOrigins()) {
    candidates.add(normalizeBase(origin))
  }

  return [...candidates]
}

function persistWorkingApiBase(base: string) {
  localStorage.setItem(API_BASE_STORAGE_KEY, normalizeBase(base))
}

function _getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function setStoredUser(user: AuthUser) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
}

export async function signInWithProfile(name: string, email: string) {
  const normalizedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()

  if (normalizedName.length < 2) {
    throw new AuthApiError('Enter a valid name')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AuthApiError('Enter a valid email address')
  }

  const candidates = getApiBaseCandidates()
  let lastError: AuthApiError | null = null

  for (const apiBase of candidates) {
    let response: Response

    try {
      response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: normalizedName, email: normalizedEmail }),
      })
    } catch {
      lastError = new AuthApiError('Cannot reach backend auth service. Start the backend server.')
      continue
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: response.statusText || 'Login failed' })) as { error?: string }
      const message = payload.error || response.statusText || 'Login failed'

      if ([404, 502, 503, 504].includes(response.status)) {
        lastError = new AuthApiError(message, response.status)
        continue
      }

      throw new AuthApiError(message, response.status)
    }

    const data = await response.json().catch(() => null) as { token: string; user: AuthUser } | null
    if (!data?.token || !data?.user) {
      // Response was 200 but body wasn't JSON (e.g. Codespaces auth wall HTML redirect)
      lastError = new AuthApiError('Unexpected response from server. Try again.')
      continue
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
    setStoredUser(data.user)
    persistWorkingApiBase(apiBase)
    return data.user
  }

  clearStoredApiBase()
  throw lastError || new AuthApiError('Login failed. Please try again.')
}

export async function fetchAuthenticatedUser() {
  const token = getStoredToken()
  if (!token) {
    return null
  }

  const candidates = getApiBaseCandidates()

  for (const apiBase of candidates) {
    let response: Response

    try {
      response = await fetch(`${apiBase}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch {
      continue
    }

    if (!response.ok) {
      if ([404, 502, 503, 504].includes(response.status)) {
        continue
      }
      clearStoredToken()
      return null
    }

    const data = await response.json().catch(() => null) as { user: AuthUser } | null
    if (!data?.user) {
      continue
    }
    setStoredUser(data.user)
    persistWorkingApiBase(apiBase)
    return data.user
  }

  throw new AuthApiError('Cannot reach backend auth service. Start the backend server.')
}
