import { useCallback, useEffect, useState } from 'react'
import { fetchAuthenticatedUser, signInWithProfile, type AuthUser } from '@/lib/auth'

const DEFAULT_USER_PROFILE = {
  name: 'Control Tower Operator',
  email: 'operator@aegischain.ai',
}

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const hydrate = async () => {
      try {
        const sessionUser = await fetchAuthenticatedUser()
        if (!mounted) {
          return
        }

        if (sessionUser) {
          setUser(sessionUser)
        } else {
          const defaultUser = await signInWithProfile(DEFAULT_USER_PROFILE.name, DEFAULT_USER_PROFILE.email)
          if (mounted) {
            setUser(defaultUser)
          }
        }
      } catch (error) {
        if (mounted) {
          setProfileError(error instanceof Error ? error.message : 'Unable to initialize profile')
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

  const updateProfile = useCallback(async (name: string, email: string) => {
    setProfileError(null)
    setLoading(true)
    try {
      const sessionUser = await signInWithProfile(name, email)
      setUser(sessionUser)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Unable to update profile. Check your details and try again.'
      setProfileError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    user,
    loading,
    profileError,
    updateProfile,
  }
}
