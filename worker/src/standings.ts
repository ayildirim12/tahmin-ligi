import { Timestamp } from 'firebase-admin/firestore'
import { fetchStandings } from './highlightlyApi.ts'
import { db } from './firestoreAdmin.ts'

type FormResult = 'W' | 'D' | 'L'

/**
 * Highlightly's `/standings` endpoint doesn't return a form string (confirmed absent — see
 * worker/AGENTS.md §4), so "Son 5" is derived ourselves from our own `matches` collection
 * instead of trusting the API for it. One query for every FINISHED match, then a per-team
 * last-5 (chronological, oldest→newest — StandingsTable renders the array left to right) is
 * built in memory; cheap even for a full season (~150-300 docs), and only runs on the
 * low-frequency housekeeping cadence alongside the rest of syncStandings.
 */
async function computeFormByTeam(): Promise<Record<string, FormResult[]>> {
  const finished = await db
    .collection('matches')
    .where('status', '==', 'FINISHED')
    .orderBy('kickoffAt', 'asc')
    .get()

  const byTeam: Record<string, FormResult[]> = {}
  for (const doc of finished.docs) {
    const m = doc.data()
    if (m.finalHomeGoals === null || m.finalAwayGoals === null) continue

    const homeResult: FormResult =
      m.finalHomeGoals > m.finalAwayGoals ? 'W' : m.finalHomeGoals < m.finalAwayGoals ? 'L' : 'D'
    const awayResult: FormResult =
      homeResult === 'W' ? 'L' : homeResult === 'L' ? 'W' : 'D'

    ;(byTeam[m.homeTeamId] ??= []).push(homeResult)
    ;(byTeam[m.awayTeamId] ??= []).push(awayResult)
  }

  for (const teamId in byTeam) {
    byTeam[teamId] = byTeam[teamId].slice(-5)
  }
  return byTeam
}

export async function syncStandings(): Promise<void> {
  const [rows, formByTeam] = await Promise.all([fetchStandings(), computeFormByTeam()])

  await db
    .collection('standings')
    .doc('superlig')
    .set({
      updatedAt: Timestamp.now(),
      rows: rows.map((row) => ({
        teamId: String(row.team.id),
        position: row.position,
        played: row.total.games,
        won: row.total.wins,
        drawn: row.total.draws,
        lost: row.total.loses,
        goalsFor: row.total.scoredGoals,
        goalsAgainst: row.total.receivedGoals,
        goalDiff: row.total.scoredGoals - row.total.receivedGoals,
        points: row.points,
        form: formByTeam[String(row.team.id)] ?? [],
      })),
    })

  await db
    .collection('meta')
    .doc('config')
    .set({ lastStandingsSyncAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true })
}
