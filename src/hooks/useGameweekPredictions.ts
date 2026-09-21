import { onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { predictionsCol } from '@/firebase/firestore'
import type { Prediction } from '@/shared/types'

function mapPrediction(id: string, data: Record<string, unknown>): Prediction {
  const ts = (v: unknown) => (v as { toMillis: () => number } | null)?.toMillis?.() ?? 0
  return {
    id,
    uid: data.uid as string,
    matchId: data.matchId as string,
    homeGoals: data.homeGoals as number,
    awayGoals: data.awayGoals as number,
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
    locked: Boolean(data.locked),
    points: (data.points as number) ?? null,
  }
}

/**
 * Two separate queries, merged — required by the security rules' "list is
 * only provable when the query itself is filtered by uid or locked" design
 * (see firestore.rules): every OTHER member's prediction becomes visible
 * once locked, while the caller's own stays visible regardless of lock state.
 */
export function useGameweekPredictions(communityId: string) {
  const { user } = useAuth()
  const [byKey, setByKey] = useState<Record<string, Prediction>>({})
  const [lockedLoaded, setLockedLoaded] = useState(false)
  const [mineLoaded, setMineLoaded] = useState(false)

  useEffect(() => {
    setLockedLoaded(false)
    setMineLoaded(false)
    setByKey({})
    if (!user) return

    const lockedQuery = query(predictionsCol(communityId), where('locked', '==', true))
    const mineQuery = query(predictionsCol(communityId), where('uid', '==', user.uid))

    const unsubLocked = onSnapshot(lockedQuery, (snap) => {
      setByKey((prev) => {
        const next = { ...prev }
        for (const d of snap.docs) next[d.id] = mapPrediction(d.id, d.data())
        return next
      })
      setLockedLoaded(true)
    })

    const unsubMine = onSnapshot(mineQuery, (snap) => {
      setByKey((prev) => {
        const next = { ...prev }
        for (const d of snap.docs) next[d.id] = mapPrediction(d.id, d.data())
        return next
      })
      setMineLoaded(true)
    })

    return () => {
      unsubLocked()
      unsubMine()
    }
  }, [communityId, user])

  return { predictionsByKey: byKey, loading: !lockedLoaded || !mineLoaded }
}

export function predictionKey(uid: string, matchId: string) {
  return `${uid}_${matchId}`
}
