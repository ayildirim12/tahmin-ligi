import { Timestamp } from 'firebase-admin/firestore'
import { db } from './firestoreAdmin.ts'

/**
 * Flips `locked: true` on every not-yet-locked prediction (across every
 * community) for any match whose kickoff has passed. Pure Firestore work,
 * no API-Football cost — safe to run on every worker tick.
 */
// Only matches that kicked off recently can still have unlocked predictions to lock — once a
// kickoff has passed the rules reject new/edited predictions, so one pass after kickoff is
// enough. Scanning the whole season on every 5-minute run blew through Firestore's free
// 50k-reads/day quota.
const LOCK_LOOKBACK_MS = 3 * 24 * 60 * 60_000

export async function runLockMaintenance(): Promise<void> {
  const now = Timestamp.now()
  const since = Timestamp.fromMillis(now.toMillis() - LOCK_LOOKBACK_MS)
  const pastKickoffMatches = await db
    .collection('matches')
    .where('kickoffAt', '>', since)
    .where('kickoffAt', '<=', now)
    .get()
  if (pastKickoffMatches.empty) return

  for (const matchDoc of pastKickoffMatches.docs) {
    // Keyed on the kickoff time so a rescheduled match gets locked again at its new kickoff.
    const kickoffMs = matchDoc.data().kickoffAt.toMillis()
    if (matchDoc.data().locksDoneForKickoffMs === kickoffMs) continue

    // Collection-group query filtered by the already-indexed `matchId` field;
    // `locked` is filtered in memory rather than adding another composite
    // index, since the result set per match (across all communities) is
    // small at this app's scale.
    const predictions = await db
      .collectionGroup('predictions')
      .where('matchId', '==', matchDoc.id)
      .get()

    const stillUnlocked = predictions.docs.filter((d) => d.data().locked === false)
    const batch = db.batch()
    for (const predictionDoc of stillUnlocked) {
      batch.update(predictionDoc.ref, { locked: true })
    }
    batch.update(matchDoc.ref, { locksDoneForKickoffMs: kickoffMs })
    await batch.commit()
  }
}
