import { Timestamp } from 'firebase-admin/firestore'
import { config } from './config.ts'
import { fetchLiveFixtures } from './apiFootball.ts'
import { db } from './firestoreAdmin.ts'
import { mapApiStatus } from './statusMap.ts'
import { recordApiRequest } from './quota.ts'

/**
 * One `/fixtures?live=all` call covers every concurrently-live match across
 * ALL leagues — filtered down to ours here. Returns the ids of any match
 * that just transitioned to FINISHED this poll, so the caller can finalize
 * points immediately rather than waiting for the next housekeeping pass.
 */
export async function pollLiveScores(): Promise<{ newlyFinishedMatchIds: string[] }> {
  const fixtures = await fetchLiveFixtures()
  await recordApiRequest()

  const relevant = fixtures.filter((f) => f.league.id === config.leagueId)
  if (relevant.length === 0) return { newlyFinishedMatchIds: [] }

  const batch = db.batch()
  const newlyFinished: string[] = []

  for (const fixture of relevant) {
    const matchId = String(fixture.fixture.id)
    const ref = db.collection('matches').doc(matchId)
    const status = mapApiStatus(fixture.fixture.status.short)
    const snap = await ref.get()
    const wasFinished = snap.exists && snap.data()?.status === 'FINISHED'

    batch.set(
      ref,
      {
        status,
        liveHomeGoals: fixture.goals.home,
        liveAwayGoals: fixture.goals.away,
        finalHomeGoals: status === 'FINISHED' ? fixture.goals.home : (snap.data()?.finalHomeGoals ?? null),
        finalAwayGoals: status === 'FINISHED' ? fixture.goals.away : (snap.data()?.finalAwayGoals ?? null),
        elapsedMinutes: fixture.fixture.status.elapsed,
        lastSyncedAt: Timestamp.now(),
      },
      { merge: true },
    )

    if (status === 'FINISHED' && !wasFinished) newlyFinished.push(matchId)
  }

  await batch.commit()
  return { newlyFinishedMatchIds: newlyFinished }
}
