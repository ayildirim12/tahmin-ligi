import { Timestamp } from 'firebase-admin/firestore'
import { fetchStandings } from './apiFootball.ts'
import { db } from './firestoreAdmin.ts'

function parseForm(form: string): Array<'W' | 'D' | 'L'> {
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
        position: row.rank,
        played: row.all.played,
        won: row.all.win,
        drawn: row.all.draw,
        lost: row.all.lose,
        goalsFor: row.all.goals.for,
        goalsAgainst: row.all.goals.against,
        goalDiff: row.goalsDiff,
        points: row.points,
        form: parseForm(row.form ?? ''),
      })),
    })

  await db
    .collection('meta')
    .doc('config')
    .set({ lastStandingsSyncAt: Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true })
}
