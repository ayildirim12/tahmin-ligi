import { db } from './firestoreAdmin.ts'
import { fetchLeagueTeams } from './highlightlyApi.ts'
import { TEAM_OVERRIDES } from './teamOverrides.ts'

/**
 * Upserts the season's team list (name, short code). Cheap — run on the low-frequency
 * housekeeping cadence.
 *
 * Crests are NOT sourced from here — Highlightly's `team.logo` URLs were found to be
 * outdated/stale. Instead, crests are bundled locally at `public/crests/{teamId}.png`
 * (teamId == this doc's id == Highlightly's numeric team id) and resolved client-side by
 * `TeamCrest.tsx`, entirely decoupled from the live API.
 *
 * `name`/`shortName` are ALSO not trusted as-is from the API — see teamOverrides.ts for why
 * (stale post-rename names, inconsistent Turkish diacritic handling). Known teams get their
 * curated override; an unknown team id (a future promotion/relegation swap) falls back to the
 * raw API name with a mechanically-derived shortName.
 */
export async function syncTeams(): Promise<void> {
  const teams = await fetchLeagueTeams()
  const batch = db.batch()

  for (const team of teams) {
    const id = String(team.id)
    const override = TEAM_OVERRIDES[id]
    const ref = db.collection('teams').doc(id)
    batch.set(
      ref,
      {
        apiTeamId: team.id,
        name: override?.name ?? team.name,
        shortName: override?.shortName ?? team.name.slice(0, 3).toUpperCase(),
      },
      { merge: true },
    )
  }

  await batch.commit()
}
