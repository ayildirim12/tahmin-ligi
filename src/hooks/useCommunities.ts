import { getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getMemberCount } from '@/firebase/communityActions'
import { communityDoc, membersCollectionGroup } from '@/firebase/firestore'

export interface CommunitySummary {
  id: string
  name: string
  memberCount: number
  role: 'owner' | 'member'
}

export function useCommunities() {
  const { user } = useAuth()
  const [communities, setCommunities] = useState<CommunitySummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setCommunities([])
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(membersCollectionGroup, where('uid', '==', user.uid))

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const entries = await Promise.all(
          snapshot.docs.map(async (memberSnap) => {
            try {
              const communityId = memberSnap.ref.parent.parent?.id
              if (!communityId) return null
              const communitySnap = await getDoc(communityDoc(communityId))
              if (!communitySnap.exists()) return null
              const data = communitySnap.data()
              const memberCount = await getMemberCount(communityId)
              return {
                id: communityId,
                name: data.name as string,
                memberCount,
                role: memberSnap.data().role as 'owner' | 'member',
              } satisfies CommunitySummary
            } catch {
              // A single community's detail fetch failing (e.g. a transient
              // hiccup right after creation) shouldn't blank out the rest.
              return null
            }
          }),
        )

        setCommunities(entries.filter((c): c is CommunitySummary => c !== null))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsubscribe
  }, [user])

  return { communities, loading }
}
