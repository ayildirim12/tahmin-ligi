import { Timestamp } from 'firebase-admin/firestore'
import { fetchMatchesForDate } from './highlightlyApi.ts'
import { db } from './firestoreAdmin.ts'
import { mapApiStatus, parseScore } from './statusMap.ts'

// Turkey has stayed on UTC+3 year-round since 2016 (no DST) — a fixed offset is safe here.
const TURKEY_UTC_OFFSET_HOURS = 3

function turkeyTodayYmd(): string {
  const now = new Date(Date.now() + TURKEY_UTC_OFFSET_HOURS * 60 * 60_000)
  return now.toISOString().slice(0, 10)
}

/**
 * Highlightly has no global "live=all" endpoint (unlike API-Football) — one call per
 * league+date instead. Since we only ever care about Süper Lig, this is still exactly
 * one request per poll and still covers every concurrently-live Süper Lig match at once
 * (today's full match list, filtered to LIVE/HT here). Returns the ids of any match that
 * just transitioned to FINISHED this poll, so the caller can finalize points immediately.
 */
export async function pollLiveScores(): Promise<{ newlyFinishedMatchIds: string[] }> {
  const todaysMatches = await fetchMatchesForDate(turkeyTodayYmd())

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
