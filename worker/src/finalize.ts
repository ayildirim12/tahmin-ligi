import { FieldValue } from 'firebase-admin/firestore'
import { computeMatchPoints, isTendencyOrBetter } from '../../src/shared/scoring.ts'
import { db } from './firestoreAdmin.ts'

/**
 * Finalizes points for every FINISHED match that hasn't been finalized yet
 * (across every community). Idempotent — `pointsFinalized` guards against
 * redoing work on the next tick, and re-running is harmless either way since
 * it always recomputes from the same deterministic scoring function.
 */
export async function finalizeFinishedMatches(explicitMatchIds?: string[]): Promise<void> {
  const candidates = explicitMatchIds
    ? await Promise.all(explicitMatchIds.map((id) => db.collection('matches').doc(id).get()))
    : (await db.collection('matches').where('status', '==', 'FINISHED').get()).docs

  for (const matchDoc of candidates) {
    if (!matchDoc.exists) continue
    const match = matchDoc.data()!
    if (match.status !== 'FINISHED' || match.pointsFinalized === true) continue
    if (match.finalHomeGoals === null || match.finalAwayGoals === null) continue

    try {
      await finalizeOneMatch(matchDoc.id, match.finalHomeGoals, match.finalAwayGoals)
    } catch (err) {
      // One bad match shouldn't block finalizing the rest.
      console.error(`Failed to finalize match ${matchDoc.id}:`, err)
    }
  }
}

async function finalizeOneMatch(matchId: string, finalHomeGoals: number, finalAwayGoals: number) {
  const predictions = await db.collectionGroup('predictions').where('matchId', '==', matchId).get()

  const batch = db.batch()
  const memberIncrements: Array<{ uid: string; communityId: string; points: number; isWin: boolean }> = []

  for (const predictionDoc of predictions.docs) {
    const data = predictionDoc.data()
    if (data.points !== null && data.points !== undefined) continue // already finalized

    const points = computeMatchPoints(
      { homeGoals: data.homeGoals, awayGoals: data.awayGoals },
      { homeGoals: finalHomeGoals, awayGoals: finalAwayGoals },
    )
    batch.update(predictionDoc.ref, { points, locked: true })

    memberIncrements.push({
      uid: data.uid,
      communityId: data.communityId,
      points,
      isWin: isTendencyOrBetter(points),
    })
  }

  for (const { uid, communityId, points, isWin } of memberIncrements) {
    const memberRef = db.collection('communities').doc(communityId).collection('members').doc(uid)
    batch.update(memberRef, {
      totalPoints: FieldValue.increment(points),
      totalPredictions: FieldValue.increment(1),
      winsCount: FieldValue.increment(isWin ? 1 : 0),
      lastUpdatedMatchId: matchId,
    })
  }

  batch.update(db.collection('matches').doc(matchId), { pointsFinalized: true })
  await batch.commit()
}
