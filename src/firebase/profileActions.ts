import { getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { memberDoc, userDoc } from './firestore'

export const MAX_DISPLAY_NAME_LENGTH = 24

export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length < 2) return 'İsim en az 2 karakter olmalı.'
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return `İsim en fazla ${MAX_DISPLAY_NAME_LENGTH} karakter olabilir.`
  }
  return null
}

export async function getOwnDisplayName(uid: string): Promise<string | null> {
  const snap = await getDoc(userDoc(uid))
  return snap.exists() ? ((snap.data().displayName as string | null) ?? null) : null
}

/**
 * Saves the name the user chose for themselves. The name is denormalized onto
 * every member doc they own (that's what the leaderboard and member list read),
 * so both places are updated together — a failure on one community's member doc
 * shouldn't block the rest, since the `users` doc is the source of truth and a
 * later save will reconcile the stragglers.
 */
export async function saveDisplayName(uid: string, name: string, communityIds: string[]) {
  const trimmed = name.trim()

  await updateDoc(userDoc(uid), { displayName: trimmed, updatedAt: serverTimestamp() })

  await Promise.allSettled(
    communityIds.map((communityId) =>
      updateDoc(memberDoc(communityId, uid), { displayName: trimmed }),
    ),
  )
}
