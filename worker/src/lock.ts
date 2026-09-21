import { Timestamp } from 'firebase-admin/firestore'
import { db } from './firestoreAdmin.ts'

/**
 * Flips `locked: true` on every not-yet-locked prediction (across every
 * community) for any match whose kickoff has passed. Pure Firestore work,
 * no API-Football cost — safe to run on every worker tick.
 */
export async function runLockMaintenance(): Promise<void> {
  const now = Timestamp.now()
  const pastKickoffMatches = await db.collection('matches').where('kickoffAt', '<=', now).get()
  if (pastKickoffMatches.empty) return

  for (const matchDoc of pastKickoffMatches.docs) {
    // Collection-group query filtered by the already-indexed `matchId` field;
    // `locked` is filtered in memory rather than adding another composite
    // index, since the result set per match (across all communities) is
    // small at this app's scale.
    const predictions = await db
      .collectionGroup('predictions')
      .where('matchId', '==', matchDoc.id)
      .get()

    const stillUnlocked = predictions.docs.filter((d) => d.data().locked === false)
    if (stillUnlocked.length === 0) continue

    const batch = db.batch()
    for (const predictionDoc of stillUnlocked) {
      batch.update(predictionDoc.ref, { locked: true })
    }
    await batch.commit()
  }
}
