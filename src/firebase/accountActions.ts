import type { User } from 'firebase/auth'
import { GoogleAuthProvider, deleteUser, reauthenticateWithPopup } from 'firebase/auth'
import { deleteDoc, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore'
import type { CommunitySummary } from '@/hooks/useCommunities'
import { db } from './config'
import { deleteCommunity, leaveCommunity, userPredictionsQuery } from './communityActions'
import { communityDoc } from './firestore'

export class BlockedByOwnedCommunitiesError extends Error {
  readonly communities: CommunitySummary[]

  constructor(communities: CommunitySummary[]) {
    super('Sole owner of one or more communities with other members')
    this.communities = communities
  }
}

/**
 * Deletes the signed-in user's account and every trace of their data.
 *
 * Communities where the user is the OWNER and other members remain block the
 * whole deletion up front (decision: require transferring or deleting those
 * communities first, rather than silently auto-transferring ownership) —
 * everything else proceeds: communities the user solely owns and is the last
 * member of are deleted outright, regular memberships are left, and any
 * remaining predictions (a defence-in-depth sweep, in case a community's own
 * cleanup ever missed one) are removed by a final self-uid collection-group
 * query, which the security rules permit regardless of current membership.
 */
export async function deleteAccount(user: User, communities: CommunitySummary[]) {
  const blocking = communities.filter((c) => c.role === 'owner' && c.memberCount > 1)
  if (blocking.length > 0) {
    throw new BlockedByOwnedCommunitiesError(blocking)
  }

  for (const community of communities) {
    if (community.role === 'owner') {
      const inviteCode = await getOwnInviteCode(community.id)
      if (inviteCode) await deleteCommunity(user, community.id, inviteCode)
    } else {
      await leaveCommunity(user, community.id)
    }
  }

  await sweepRemainingPredictions(user.uid)
  await deleteDoc(doc(db, 'users', user.uid))

  try {
    await deleteUser(user)
  } catch (err: unknown) {
    if (isRequiresRecentLogin(err)) {
      await reauthenticateWithPopup(user, new GoogleAuthProvider())
      await deleteUser(user)
    } else {
      throw err
    }
  }
}

async function getOwnInviteCode(communityId: string): Promise<string | null> {
  const snap = await getDoc(communityDoc(communityId))
  return snap.exists() ? (snap.data().inviteCode as string) : null
}

async function sweepRemainingPredictions(uid: string) {
  const snap = await getDocs(userPredictionsQuery(uid))
  if (snap.empty) return
  const batch = writeBatch(db)
  for (const predictionSnap of snap.docs) {
    batch.delete(predictionSnap.ref)
  }
  await batch.commit()
}

function isRequiresRecentLogin(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'auth/requires-recent-login'
}
