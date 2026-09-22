import { getDocs } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { teamsCol } from '@/firebase/firestore'
import type { Team } from '@/shared/types'

let cachedTeams: Record<string, Team> | null = null

/** Teams are static reference data for the season — fetched once and cached in memory. */
export function useTeams() {
  const [teams, setTeams] = useState<Record<string, Team> | null>(cachedTeams)
  const [loading, setLoading] = useState(!cachedTeams)

  useEffect(() => {
    if (cachedTeams) return
    getDocs(teamsCol).then((snap) => {
      const map: Record<string, Team> = {}
      for (const teamSnap of snap.docs) {
        const data = teamSnap.data()
        map[teamSnap.id] = {
          id: teamSnap.id,
          apiTeamId: data.apiTeamId,
          name: data.name,
          shortName: data.shortName,
        }
      }
      cachedTeams = map
      setTeams(map)
      setLoading(false)
    })
  }, [])

  return { teams: teams ?? {}, loading }
}
