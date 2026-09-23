import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { predictionDoc } from '@/firebase/firestore'
import type { Prediction } from '@/shared/types'

export function useMyPrediction(communityId: string, matchId: string) {
  const { user } = useAuth()
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setPrediction(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = onSnapshot(predictionDoc(communityId, user.uid, matchId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setPrediction({
          id: snap.id,
          uid: data.uid,
          communityId: data.communityId,
          matchId: data.matchId,
          homeGoals: data.homeGoals,
          awayGoals: data.awayGoals,
          createdAt: data.createdAt?.toMillis?.() ?? 0,
          updatedAt: data.updatedAt?.toMillis?.() ?? 0,
          locked: data.locked,
          points: data.points ?? null,
        })
      } else {
        setPrediction(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [communityId, matchId, user])

  return { prediction, loading }
}
