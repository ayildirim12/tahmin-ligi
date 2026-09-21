import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from './config'

export const usersCol = collection(db, 'users')
export const communitiesCol = collection(db, 'communities')
export const inviteCodesCol = collection(db, 'inviteCodes')
export const teamsCol = collection(db, 'teams')
export const matchesCol = collection(db, 'matches')
export const membersCollectionGroup = collectionGroup(db, 'members')
export const predictionsCollectionGroup = collectionGroup(db, 'predictions')

export function communityDoc(communityId: string) {
  return doc(db, 'communities', communityId)
}

export function membersCol(communityId: string) {
  return collection(db, 'communities', communityId, 'members')
}

export function memberDoc(communityId: string, uid: string) {
  return doc(db, 'communities', communityId, 'members', uid)
}

export function predictionsCol(communityId: string) {
  return collection(db, 'communities', communityId, 'predictions')
}

export function predictionDoc(communityId: string, uid: string, matchId: string) {
  return doc(db, 'communities', communityId, 'predictions', `${uid}_${matchId}`)
}

export function inviteCodeDoc(code: string) {
  return doc(db, 'inviteCodes', code)
}

export function standingsDoc() {
  return doc(db, 'standings', 'superlig')
}

export function configDoc() {
  return doc(db, 'meta', 'config')
}

export async function ensureUserDoc(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return

  await setDoc(ref, {
    displayName: user.displayName ?? 'İsimsiz Kullanıcı',
    email: user.email,
    photoURL: user.photoURL,
    communityIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
