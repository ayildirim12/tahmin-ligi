import { onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { matchesCol } from '@/firebase/firestore'
import { mapMatch } from '@/hooks/useGameweekMatches'
import type { Match } from '@/shared/types'

/** All matches currently in progress (any gameweek), updated in real time. */
export function useLiveMatches() {
  const [matches, setMatches] = useState<Match[]>([])

  useEffect(() => {
    const q = query(matchesCol, where('status', 'in', ['LIVE', 'HT']))
    return onSnapshot(
      q,
      (snap) => setMatches(snap.docs.map((d) => mapMatch(d.id, d.data()))),
      (error) => console.error('useLiveMatches: listener failed', error),
    )
  }, [])

  return matches
}
