import { Timestamp } from 'firebase-admin/firestore'
import { fetchStandings } from './highlightlyApi.ts'
import { db } from './firestoreAdmin.ts'

function parseForm(form: string | undefined): Array<'W' | 'D' | 'L'> {
  if (!form) return []
  return form
    .split('')
    .filter((c): c is 'W' | 'D' | 'L' => c === 'W' || c === 'D' || c === 'L')
    .slice(-5)
}

export async function syncStandings(): Promise<void> {
  const rows = await fetchStandings()

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
        // `form` is confirmed ABSENT from this endpoint (worker/AGENTS.md §4) — degrades
        // gracefully to no form badges (StandingsTable handles an empty array fine).
        form: parseForm(row.form),
      })),
    })

  await db
    .collection('meta')
    .doc('config')
    .set({ lastStandingsSyncAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true })
}
