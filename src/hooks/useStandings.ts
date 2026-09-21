import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { standingsDoc } from '@/firebase/firestore'
import type { StandingsRow } from '@/shared/types'

export function useStandings() {
  const [rows, setRows] = useState<StandingsRow[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(standingsDoc(), (snap) => {
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
  }, [])

  return { rows, updatedAt, loading }
}
