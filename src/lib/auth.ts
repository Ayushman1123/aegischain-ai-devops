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

  const user: AuthUser = {
    id: btoa(normalizedEmail),
    name: normalizedName,
    email: normalizedEmail,
    picture: '',
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, `local-${Date.now()}-${user.id}`)
  setStoredUser(user)
  return user
}

export async function fetchAuthenticatedUser() {
  const token = getStoredToken()
  if (!token) {
    return null
  }

  const user = getStoredUser()
  if (!user) {
    clearStoredToken()
    return null
  }

  return user
}
