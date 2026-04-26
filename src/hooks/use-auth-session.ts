import { useCallback, useEffect, useState } from 'react'
import { clearStoredToken, fetchAuthenticatedUser, signInWithProfile, type AuthUser } from '@/lib/auth'

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const hydrate = async () => {
      try {
        let sessionUser = await fetchAuthenticatedUser()
        if (!sessionUser) {
          sessionUser = await signInWithProfile('AegisChain Operator', 'operator@aegischain.ai')
        }
        if (mounted) {
          setUser(sessionUser)
        }
      } catch (error) {
        if (mounted) {
          setAuthError(error instanceof Error ? error.message : 'Unable to restore session')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    hydrate()

    return () => {
      mounted = false
    }
  }, [])

  const loginWithProfile = useCallback(async (name: string, email: string) => {
    setAuthError(null)
    setLoading(true)
    try {
      const sessionUser = await signInWithProfile(name, email)
      setUser(sessionUser)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Sign-in failed. Check your details and try again.'
      setAuthError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setUser(null)
    setAuthError(null)
  }, [])

  return {
    user,
    loading,
    authError,
    loginWithProfile,
    logout,
  }
}
