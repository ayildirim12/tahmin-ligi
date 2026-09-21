import { onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { matchesCol } from '@/firebase/firestore'
import type { Match } from '@/shared/types'

function mapMatch(id: string, data: Record<string, unknown>): Match {
  const ts = (v: unknown) => (v as { toMillis: () => number } | null)?.toMillis?.() ?? 0
  return {
    id,
    apiFixtureId: data.apiFixtureId as number,
    season: data.season as string,
    gameweek: data.gameweek as number,
    homeTeamId: data.homeTeamId as string,
    awayTeamId: data.awayTeamId as string,
    kickoffAt: ts(data.kickoffAt),
    status: data.status as Match['status'],
    liveHomeGoals: (data.liveHomeGoals as number) ?? null,
    liveAwayGoals: (data.liveAwayGoals as number) ?? null,
    finalHomeGoals: (data.finalHomeGoals as number) ?? null,
    finalAwayGoals: (data.finalAwayGoals as number) ?? null,
    elapsedMinutes: (data.elapsedMinutes as number) ?? null,
    lastSyncedAt: ts(data.lastSyncedAt),
    pointsFinalized: Boolean(data.pointsFinalized),
  }
}

export function useGameweekMatches(gameweek: number | null) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (gameweek === null) {
      setMatches([])
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(matchesCol, where('gameweek', '==', gameweek), orderBy('kickoffAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snap) => {
      setMatches(snap.docs.map((d) => mapMatch(d.id, d.data())))
      setLoading(false)
    })
    return unsubscribe
  }, [gameweek])

  return { matches, loading }
}

export { mapMatch }
