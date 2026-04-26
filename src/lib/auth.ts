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
const TOKEN_STORAGE_KEY = 'aegischain.auth.token'
const USER_STORAGE_KEY = 'aegischain.auth.user'

function getStoredUser(): AuthUser | null {
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

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: normalizedName, email: normalizedEmail }),
    })
  } catch {
    throw new AuthApiError('Cannot reach backend auth service. Start the backend server.')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Login failed' })) as { error?: string }
    throw new AuthApiError(payload.error || 'Login failed', response.status)
  }

  const data = await response.json() as { token: string; user: AuthUser }
  localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
  setStoredUser(data.user)
  return data.user
}

export async function fetchAuthenticatedUser() {
  const token = getStoredToken()
  if (!token) {
    return null
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } catch {
    throw new AuthApiError('Cannot reach backend auth service. Start the backend server.')
  }

  if (!response.ok) {
    clearStoredToken()
    return null
  }

  const data = await response.json() as { user: AuthUser }
  setStoredUser(data.user)
  return data.user
}
