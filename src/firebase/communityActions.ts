import type { User } from 'firebase/auth'
import {
  arrayRemove,
  arrayUnion,
  collectionGroup,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'
import {
  communitiesCol,
  communityDoc,
  inviteCodeDoc,
  membersCol,
  memberDoc,
  predictionsCol,
} from './firestore'
import { generateInviteCode } from '@/lib/inviteCode'

/**
 * Community creation is three SEQUENTIAL writes (not one batch) so that each
 * write's security rule can `get()` the previous, already-committed document —
 * notably the member doc's "am I the owner?" check reads the community doc,
 * and the invite code doc's "am I the owner?" check does too. Firestore rules
 * evaluate `get()` against the committed database, not sibling pending writes
 * in the same batch, so batching these would make the rule un-satisfiable.
 * A crash between steps leaves an orphaned partial community — acceptable for
 * this app's scale; the hub page could self-heal this later if it ever comes up.
 */
export async function createCommunity(user: User, name: string): Promise<string> {
  const communityRef = doc(communitiesCol)
  const inviteCode = generateInviteCode()

  await setDoc(communityRef, {
    name,
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    inviteCode,
  })

  await setDoc(memberDoc(communityRef.id, user.uid), {
    uid: user.uid,
    displayName: user.displayName ?? 'İsimsiz Kullanıcı',
    photoURL: user.photoURL,
    role: 'owner',
    joinedAt: serverTimestamp(),
    totalPoints: 0,
    totalPredictions: 0,
    winsCount: 0,
    lastUpdatedMatchId: null,
  })

  await setDoc(inviteCodeDoc(inviteCode), {
    communityId: communityRef.id,
    communityName: name,
    active: true,
    createdByUid: user.uid,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, 'users', user.uid), {
    communityIds: arrayUnion(communityRef.id),
    updatedAt: serverTimestamp(),
  })

  return communityRef.id
}

export async function resolveInviteCode(code: string) {
  const snap = await getDoc(inviteCodeDoc(code))
  if (!snap.exists() || snap.data().active !== true) return null
  return snap.data() as { communityId: string; communityName: string }
}

export async function joinCommunityByCode(user: User, code: string): Promise<string> {
  const invite = await resolveInviteCode(code)
  if (!invite) throw new Error('Bu davet linki geçersiz veya artık aktif değil.')

  const existing = await getDoc(memberDoc(invite.communityId, user.uid))
  if (existing.exists()) return invite.communityId

  await setDoc(memberDoc(invite.communityId, user.uid), {
    uid: user.uid,
    displayName: user.displayName ?? 'İsimsiz Kullanıcı',
    photoURL: user.photoURL,
    role: 'member',
    joinedAt: serverTimestamp(),
    totalPoints: 0,
    totalPredictions: 0,
    winsCount: 0,
    lastUpdatedMatchId: null,
    joinedViaCode: code,
  })

  await updateDoc(doc(db, 'users', user.uid), {
    communityIds: arrayUnion(invite.communityId),
    updatedAt: serverTimestamp(),
  })

  return invite.communityId
}

export async function getMemberCount(communityId: string): Promise<number> {
  const snap = await getCountFromServer(membersCol(communityId))
  return snap.data().count
}

async function deleteMemberPredictions(
  communityId: string,
  uid: string,
  options: { onlyLocked: boolean },
) {
  // Querying another member's predictions is only permitted by the security
  // rules when additionally filtered to `locked == true` (the rule can't
  // otherwise prove every result is safe to list) — self-cleanup has no such
  // restriction since the rule's self-uid disjunct covers it unconditionally.
  const constraints = options.onlyLocked
    ? [where('uid', '==', uid), where('locked', '==', true)]
    : [where('uid', '==', uid)]
  const snap = await getDocs(query(predictionsCol(communityId), ...constraints))
  const batch = writeBatch(db)
  for (const predictionSnap of snap.docs) {
    batch.delete(predictionSnap.ref)
  }
  await batch.commit()
}

export async function leaveCommunity(user: User, communityId: string) {
  await deleteMemberPredictions(communityId, user.uid, { onlyLocked: false })
  await deleteDoc(memberDoc(communityId, user.uid))
  await updateDoc(doc(db, 'users', user.uid), {
    communityIds: arrayRemove(communityId),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Owner-only action. Best-effort cleanup of the removed member's predictions
 * in this community: only their already-*locked* (past-kickoff) predictions
 * can be found this way — security rules don't let the owner list another
 * member's still-open predictions (by design, an owner has no early visibility
 * into anyone's unrevealed picks). Any remaining open ones become harmless
 * orphans (invisible to everyone, since the member doc that would make them
 * count toward a leaderboard is gone) and get swept up later if that user
 * ever deletes their whole account, whose cascade self-queries by uid alone.
 */
export async function removeMember(communityId: string, targetUid: string) {
  await deleteMemberPredictions(communityId, targetUid, { onlyLocked: true })
  await deleteDoc(memberDoc(communityId, targetUid))
}

export async function renameCommunity(communityId: string, name: string) {
  await updateDoc(communityDoc(communityId), { name, updatedAt: serverTimestamp() })
}

/**
 * Deletes a community outright. The caller (community settings UI) must
 * confirm via `getMemberCount` that the owner is the sole remaining member
 * before offering this — with that invariant held, every prediction doc left
 * in the subcollection belongs to the owner themselves, so a self-filtered
 * query is both sufficient and (per the security rules' list-provability
 * requirement) the only query shape that's actually permitted here.
 */
export async function deleteCommunity(user: User, communityId: string, inviteCode: string) {
  const predictionsSnap = await getDocs(
    query(predictionsCol(communityId), where('uid', '==', user.uid)),
  )
  const batch = writeBatch(db)
  for (const predictionDocSnap of predictionsSnap.docs) {
    batch.delete(predictionDocSnap.ref)
  }
  batch.delete(memberDoc(communityId, user.uid))
  batch.delete(inviteCodeDoc(inviteCode))
  batch.delete(communityDoc(communityId))
  await batch.commit()

  await updateDoc(doc(db, 'users', user.uid), {
    communityIds: arrayRemove(communityId),
    updatedAt: serverTimestamp(),
  })
}

/** Finds every prediction a user has ever made across every community they belong to. */
export function userPredictionsQuery(uid: string) {
  return query(collectionGroup(db, 'predictions'), where('uid', '==', uid))
}
