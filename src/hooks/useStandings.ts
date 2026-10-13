import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useCompetition } from '@/contexts/CompetitionContext'
import { standingsDoc } from '@/firebase/firestore'
import type { StandingsRow } from '@/shared/types'

export function useStandings() {
  const { competition } = useCompetition()
  const [rows, setRows] = useState<StandingsRow[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = onSnapshot(standingsDoc(competition), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setRows(data.rows ?? [])
        setUpdatedAt(data.updatedAt?.toMillis?.() ?? null)
      } else {
        setRows([])
        setUpdatedAt(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [competition])

  return { rows, updatedAt, loading }
}
