import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { membersCol } from '@/firebase/firestore'
import type { CommunityMember } from '@/shared/types'

export function useMembers(communityId: string) {
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      membersCol(communityId),
      (snap) => {
        setMembers(
          snap.docs.map((d) => {
            const data = d.data()
            return {
              uid: data.uid,
              displayName: data.displayName,
              role: data.role,
              joinedAt: data.joinedAt?.toMillis?.() ?? 0,
              totalPoints: data.totalPoints ?? 0,
              totalPredictions: data.totalPredictions ?? 0,
              winsCount: data.winsCount ?? 0,
              lastUpdatedMatchId: data.lastUpdatedMatchId ?? null,
            } satisfies CommunityMember
          }),
        )
        setLoading(false)
      },
      (error) => {
        console.error('useMembers: listener failed', error)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [communityId])

  return { members, loading }
}
