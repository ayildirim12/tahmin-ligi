import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { userDoc } from '@/firebase/firestore'

export interface UserProfile {
  displayName: string | null
  email: string | null
  communityIds: string[]
}

/** The signed-in user's own `users/{uid}` doc — the source of truth for the
 *  name they chose for themselves (never the Google account's name). */
export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = onSnapshot(
      userDoc(user.uid),
      (snap) => {
        const data = snap.data()
        setProfile(
          snap.exists()
            ? {
                displayName: (data?.displayName as string | null) ?? null,
                email: (data?.email as string | null) ?? null,
                communityIds: (data?.communityIds as string[]) ?? [],
              }
            : null,
        )
        setLoading(false)
      },
      (error) => {
        console.error('useUserProfile: listener failed', error)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [user])

  return { profile, loading }
}
