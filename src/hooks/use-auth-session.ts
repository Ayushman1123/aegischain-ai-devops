import { useCallback, useEffect, useState } from 'react'
import { useKV } from '@github/spark/hooks'

export interface AuthUser {
  id: string
  name: string
  email: string
  picture: string
}

const DEFAULT_USER_PROFILE = {
  name: 'Control Tower Operator',
  email: 'operator@aegischain.ai',
}

export function useAuthSession() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [storedProfile, setStoredProfile] = useKV<{ name: string; email: string }>('user-profile', DEFAULT_USER_PROFILE)

  useEffect(() => {
    let mounted = true

    const hydrate = async () => {
      try {
        const sparkUser = await spark.user()
        if (!mounted) {
          return
        }

        setUser({
          id: sparkUser?.id?.toString() || 'default-operator',
          name: storedProfile?.name || sparkUser?.login || DEFAULT_USER_PROFILE.name,
          email: storedProfile?.email || sparkUser?.email || DEFAULT_USER_PROFILE.email,
          picture: sparkUser?.avatarUrl || '',
        })
      } catch (error) {
        if (mounted) {
          setUser({
            id: 'default-operator',
            name: storedProfile?.name || DEFAULT_USER_PROFILE.name,
            email: storedProfile?.email || DEFAULT_USER_PROFILE.email,
            picture: '',
          })
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
  }, [storedProfile])

  const updateProfile = useCallback(async (name: string, email: string) => {
    setProfileError(null)
    setLoading(true)
    try {
      setStoredProfile((current) => ({ ...current, name, email }))
      setUser((current) => current ? { ...current, name, email } : null)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Unable to update profile. Check your details and try again.'
      setProfileError(message)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setStoredProfile])

  return {
    user,
    loading,
    profileError,
    updateProfile,
  }
}
