import { onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { memberPredictionsCol, predictionsCollectionGroup } from '@/firebase/firestore'
import type { Prediction } from '@/shared/types'

function mapPrediction(id: string, data: Record<string, unknown>): Prediction {
  const ts = (v: unknown) => (v as { toMillis: () => number } | null)?.toMillis?.() ?? 0
  return {
    id,
    uid: data.uid as string,
    communityId: data.communityId as string,
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
 * Two separate queries, merged — predictions now live per-member
 * (`communities/{id}/members/{uid}/predictions`), so there's no single flat
 * collection to query across the whole community. "Mine" reads my own
 * nested subcollection directly (unfiltered — it's already scoped to me by
 * path); "locked" is a `collectionGroup` query filtered by the denormalized
 * `communityId` field (required — a collection-group query can't filter by
 * ancestor path) plus `locked==true`, matching the security rules' "list is
 * only provable when the query itself is filtered" design (see
 * firestore.rules). The merged map is keyed by `predictionKey(uid, matchId)`
 * derived from the DATA, never the raw doc id — the nested doc id is now
 * just `matchId`, which collides across different members' subcollections.
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

    const lockedQuery = query(
      predictionsCollectionGroup,
      where('communityId', '==', communityId),
      where('locked', '==', true),
    )
    const mineQuery = memberPredictionsCol(communityId, user.uid)

    const unsubLocked = onSnapshot(
      lockedQuery,
      (snap) => {
        setByKey((prev) => {
          const next = { ...prev }
          for (const d of snap.docs) {
            const data = d.data()
            next[predictionKey(data.uid, data.matchId)] = mapPrediction(d.id, data)
          }
          return next
        })
        setLockedLoaded(true)
      },
      (error) => {
        console.error('useGameweekPredictions: locked listener failed', error)
        setLockedLoaded(true)
      },
    )

    const unsubMine = onSnapshot(
      mineQuery,
      (snap) => {
        setByKey((prev) => {
          const next = { ...prev }
          for (const d of snap.docs) {
            const data = d.data()
            next[predictionKey(data.uid, data.matchId)] = mapPrediction(d.id, data)
          }
          return next
        })
        setMineLoaded(true)
      },
      (error) => {
        console.error('useGameweekPredictions: mine listener failed', error)
        setMineLoaded(true)
      },
    )

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
