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
        played: row.total.played,
        won: row.total.win,
        drawn: row.total.draw,
        lost: row.total.lose,
        goalsFor: row.total.goals.for,
        goalsAgainst: row.total.goals.against,
        goalDiff: row.total.goals.for - row.total.goals.against,
        points: row.points,
        // `form` presence on this endpoint is UNVERIFIED (worker/AGENTS.md §4) — degrades
        // gracefully to no form badges (StandingsTable handles an empty array fine) if absent.
        form: parseForm(row.form),
      })),
    })

  await db
    .collection('meta')
    .doc('config')
    .set({ lastStandingsSyncAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true })
}
