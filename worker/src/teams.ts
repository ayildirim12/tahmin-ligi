import { db } from './firestoreAdmin.ts'
import { fetchLeagueTeams } from './apiFootball.ts'

/** Upserts the season's team list (name, short code, official crest URL). Cheap — run on the low-frequency housekeeping cadence. */
export async function syncTeams(): Promise<void> {
  const teams = await fetchLeagueTeams()
  const batch = db.batch()

  for (const { team } of teams) {
    const ref = db.collection('teams').doc(String(team.id))
    batch.set(
      ref,
      {
        apiTeamId: team.id,
        name: team.name,
        shortName: team.code ?? team.name.slice(0, 3).toUpperCase(),
        crestUrl: team.logo,
      },
      { merge: true },
    )
  }

  await batch.commit()
}
