import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { communityDoc, memberDoc } from '@/firebase/firestore'
import type { Community, CommunityMember } from '@/shared/types'

interface UseCommunityResult {
  community: Community | null
  membership: CommunityMember | null
  loading: boolean
}

export function useCommunity(communityId: string | undefined): UseCommunityResult {
  const { user } = useAuth()
  const [community, setCommunity] = useState<Community | null>(null)
  const [membership, setMembership] = useState<CommunityMember | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!communityId || !user) {
      setCommunity(null)
      setMembership(null)
      setLoading(false)
      return
    }

    setLoading(true)
    let communityLoaded = false
    let membershipLoaded = false
    const maybeStopLoading = () => {
      if (communityLoaded && membershipLoaded) setLoading(false)
    }

    const unsubCommunity = onSnapshot(
      communityDoc(communityId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setCommunity({
            id: snap.id,
            name: data.name,
            ownerUid: data.ownerUid,
            createdAt: data.createdAt?.toMillis?.() ?? 0,
            updatedAt: data.updatedAt?.toMillis?.() ?? 0,
            inviteCode: data.inviteCode,
          })
        } else {
          setCommunity(null)
        }
        communityLoaded = true
        maybeStopLoading()
      },
      () => {
        setCommunity(null)
        communityLoaded = true
        maybeStopLoading()
      },
    )

    const unsubMembership = onSnapshot(
      memberDoc(communityId, user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setMembership({
            uid: data.uid,
            displayName: data.displayName,
            photoURL: data.photoURL,
            role: data.role,
            joinedAt: data.joinedAt?.toMillis?.() ?? 0,
            totalPoints: data.totalPoints ?? 0,
            totalPredictions: data.totalPredictions ?? 0,
            winsCount: data.winsCount ?? 0,
            lastUpdatedMatchId: data.lastUpdatedMatchId ?? null,
          })
        } else {
          setMembership(null)
        }
        membershipLoaded = true
        maybeStopLoading()
      },
      () => {
        setMembership(null)
        membershipLoaded = true
        maybeStopLoading()
      },
    )

    return () => {
      unsubCommunity()
      unsubMembership()
    }
  }, [communityId, user])

  return { community, membership, loading }
}
