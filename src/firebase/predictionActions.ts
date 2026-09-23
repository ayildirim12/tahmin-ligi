import { getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { predictionDoc } from './firestore'

/**
 * Saves a score prediction into ONE community's prediction subcollection.
 * Branches explicitly between create/update shapes to match the security
 * rules exactly (an update may only touch homeGoals/awayGoals/updatedAt;
 * locked/points must never be client-set on an existing doc).
 */
async function savePredictionInCommunity(
  communityId: string,
  uid: string,
  matchId: string,
  homeGoals: number,
  awayGoals: number,
) {
  const ref = predictionDoc(communityId, uid, matchId)
  const existing = await getDoc(ref)

  if (existing.exists()) {
    await updateDoc(ref, { homeGoals, awayGoals, updatedAt: serverTimestamp() })
  } else {
    await setDoc(ref, {
      uid,
      communityId,
      matchId,
      homeGoals,
      awayGoals,
      locked: false,
      points: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}

/**
 * A user's prediction for a real-world fixture is one fact — saving it fans
 * out to every community the user belongs to in one action, so they never
 * have to re-enter the same score per community. Failures are collected
 * rather than thrown on the first one, since a stale communityIds cache
 * entry (e.g. after being removed from a community) should not block saving
 * to the communities that ARE still valid.
 */
export async function saveMyPrediction(
  uid: string,
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  communityIds: string[],
) {
  const results = await Promise.allSettled(
    communityIds.map((communityId) =>
      savePredictionInCommunity(communityId, uid, matchId, homeGoals, awayGoals),
    ),
  )
  const failures = results.filter((r) => r.status === 'rejected')
  if (failures.length === results.length && results.length > 0) {
    throw new Error('Tahmin hiçbir topluluğa kaydedilemedi.')
  }
}
