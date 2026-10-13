import { Timestamp } from 'firebase-admin/firestore'
import type { Competition } from './competitions.ts'
import { fetchMatchesForDate } from './highlightlyApi.ts'
import { db } from './firestoreAdmin.ts'
import { mapApiStatus, parseScore } from './statusMap.ts'

/**
 * Highlightly has no global "live=all" endpoint (unlike API-Football) — one call per
 * league+date instead: one request per poll per active competition, covering every
 * concurrently-live match of that league on that date (filtered to LIVE/HT/FINISHED here). Returns the ids of any match that
 * just transitioned to FINISHED this poll, so the caller can finalize points immediately.
 */
export async function pollLiveScores(
  competition: Competition,
  dates: string[],
): Promise<{ newlyFinishedMatchIds: string[] }> {
  const todaysMatches = []
  for (const date of dates) todaysMatches.push(...(await fetchMatchesForDate(date, competition.leagueId)))

  const batch = db.batch()
  const newlyFinished: string[] = []
  let touched = 0

  for (const fixture of todaysMatches) {
    const status = mapApiStatus(fixture.state.description)
    if (status !== 'LIVE' && status !== 'HT' && status !== 'FINISHED') continue

    const matchId = String(fixture.id)
    const ref = db.collection('matches').doc(matchId)
    const { home, away } = parseScore(fixture.state.score.current)
    const snap = await ref.get()
    // Only matches the fixture sync already knows (and planned) are updated — a bare stub doc
    // (e.g. a qualifier or a not-yet-planned knockout tie) would have no gameweek/competition.
    if (!snap.exists) continue
    const wasFinished = snap.exists && snap.data()?.status === 'FINISHED'

    batch.set(
      ref,
      {
        status,
        liveHomeGoals: home,
        liveAwayGoals: away,
        finalHomeGoals: status === 'FINISHED' ? home : (snap.data()?.finalHomeGoals ?? null),
        finalAwayGoals: status === 'FINISHED' ? away : (snap.data()?.finalAwayGoals ?? null),
        elapsedMinutes: fixture.state.clock,
        lastSyncedAt: Timestamp.now(),
      },
      { merge: true },
    )
    touched++

    if (status === 'FINISHED' && !wasFinished) newlyFinished.push(matchId)
  }

  if (touched > 0) await batch.commit()
  return { newlyFinishedMatchIds: newlyFinished }
}
