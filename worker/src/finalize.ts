import { FieldValue } from 'firebase-admin/firestore'
import { computeMatchPoints, isTendencyOrBetter } from '../../src/shared/scoring.ts'
import { Timestamp } from 'firebase-admin/firestore'
import { COMPETITIONS, competitionOf } from './competitions.ts'
import { db } from './firestoreAdmin.ts'

// Reading every FINISHED match of the season on each run exhausted Firestore's free read quota;
// anything that finished unfinalized and kicked off more than this long ago is not worth
// rescanning for (an outage that long needs a manual run).
const FINALIZE_LOOKBACK_MS = 5 * 24 * 60 * 60_000

async function recentFinishedUnfinalized() {
  const now = Timestamp.now()
  const since = Timestamp.fromMillis(now.toMillis() - FINALIZE_LOOKBACK_MS)
  const snap = await db
    .collection('matches')
    .where('kickoffAt', '>', since)
    .where('kickoffAt', '<=', now)
    .get()
  return snap.docs.filter((d) => d.data().status === 'FINISHED' && d.data().pointsFinalized !== true)
}

/**
 * Finalizes points for every FINISHED match that hasn't been finalized yet
 * (across every community). Idempotent — `pointsFinalized` guards against
 * redoing work on the next tick, and re-running is harmless either way since
 * it always recomputes from the same deterministic scoring function.
 */
export async function finalizeFinishedMatches(explicitMatchIds?: string[]): Promise<void> {
  const candidates = explicitMatchIds
    ? await Promise.all(explicitMatchIds.map((id) => db.collection('matches').doc(id).get()))
    : await recentFinishedUnfinalized()

  for (const matchDoc of candidates) {
    if (!matchDoc.exists) continue
    const match = matchDoc.data()!
    if (match.status !== 'FINISHED' || match.pointsFinalized === true) continue
    if (match.finalHomeGoals === null || match.finalAwayGoals === null) continue

    try {
      await finalizeOneMatch(matchDoc.id, match.finalHomeGoals, match.finalAwayGoals, competitionOf(match))
    } catch (err) {
      // One bad match shouldn't block finalizing the rest.
      console.error(`Failed to finalize match ${matchDoc.id}:`, err)
    }
  }
}

async function finalizeOneMatch(
  matchId: string,
  finalHomeGoals: number,
  finalAwayGoals: number,
  competitionId: 'superlig' | 'ucl',
) {
  // Each competition has its own member totals, so the two leaderboards never mix.
  const fields = COMPETITIONS[competitionId].memberFields
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
      [fields.points]: FieldValue.increment(points),
      [fields.predictions]: FieldValue.increment(1),
      [fields.wins]: FieldValue.increment(isWin ? 1 : 0),
      lastUpdatedMatchId: matchId,
    })
  }

  batch.update(db.collection('matches').doc(matchId), { pointsFinalized: true })
  await batch.commit()
}
