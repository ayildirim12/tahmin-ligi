import { readFileSync } from 'node:fs'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

/**
 * Verifies the single most safety-critical behavior in the whole schema:
 * a prediction is invisible to everyone except its own author until the
 * worker flips `locked: true` — and community membership itself is required
 * even then (the "community-scoped, not global" decision). Requires the
 * Firestore emulator running locally on 127.0.0.1:8080 (see `firebase
 * emulators:start`) — this suite talks to it directly, not the app.
 */

let testEnv: RulesTestEnvironment

const COMMUNITY_ID = 'communityA'
const MATCH_ID = 'match1'
const OWNER_UID = 'ownerUid'
const MEMBER_UID = 'memberUid'
const OUTSIDER_UID = 'outsiderUid'

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-tahmin-ligi-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await db
      .collection('matches')
      .doc(MATCH_ID)
      .set({ kickoffAt: new Date(Date.now() + 60 * 60_000), status: 'SCHEDULED' })
    await db.collection('communities').doc(COMMUNITY_ID).set({ name: 'A', ownerUid: OWNER_UID })
    await db
      .collection('communities')
      .doc(COMMUNITY_ID)
      .collection('members')
      .doc(OWNER_UID)
      .set({ uid: OWNER_UID, role: 'owner' })
    await db
      .collection('communities')
      .doc(COMMUNITY_ID)
      .collection('members')
      .doc(MEMBER_UID)
      .set({ uid: MEMBER_UID, role: 'member' })
    await db
      .collection('communities')
      .doc(COMMUNITY_ID)
      .collection('predictions')
      .doc(`${OWNER_UID}_${MATCH_ID}`)
      .set({ uid: OWNER_UID, matchId: MATCH_ID, homeGoals: 2, awayGoals: 1, locked: false, points: null })
  })
})

function predictionRef(uid: string) {
  return (ctx: ReturnType<RulesTestEnvironment['authenticatedContext']>) =>
    ctx.firestore().collection('communities').doc(COMMUNITY_ID).collection('predictions').doc(`${uid}_${MATCH_ID}`)
}

describe('predictions visibility', () => {
  it('the author can read their own unlocked prediction', async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID)
    await assertSucceeds(predictionRef(OWNER_UID)(owner).get())
  })

  it('a fellow COMMUNITY MEMBER cannot read an unlocked prediction that is not theirs', async () => {
    const member = testEnv.authenticatedContext(MEMBER_UID)
    await assertFails(predictionRef(OWNER_UID)(member).get())
  })

  it('a fellow community member CAN read it once locked', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('communities')
        .doc(COMMUNITY_ID)
        .collection('predictions')
        .doc(`${OWNER_UID}_${MATCH_ID}`)
        .update({ locked: true })
    })
    const member = testEnv.authenticatedContext(MEMBER_UID)
    await assertSucceeds(predictionRef(OWNER_UID)(member).get())
  })

  it('a signed-in user who is NOT a member of this community cannot read it, even once locked', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection('communities')
        .doc(COMMUNITY_ID)
        .collection('predictions')
        .doc(`${OWNER_UID}_${MATCH_ID}`)
        .update({ locked: true })
    })
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID)
    await assertFails(predictionRef(OWNER_UID)(outsider).get())
  })

  it('an unauthenticated client cannot read it at all', async () => {
    const anon = testEnv.unauthenticatedContext()
    await assertFails(predictionRef(OWNER_UID)(anon).get())
  })
})

describe('community enumeration is blocked', () => {
  it('the communities collection can never be listed, even by a member', async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID)
    await assertFails(owner.firestore().collection('communities').get())
  })

  it('the members collection group cannot be listed unfiltered by uid', async () => {
    const owner = testEnv.authenticatedContext(OWNER_UID)
    await assertFails(owner.firestore().collectionGroup('members').get())
  })

  it('a non-member cannot get() the community document', async () => {
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID)
    await assertFails(outsider.firestore().collection('communities').doc(COMMUNITY_ID).get())
  })

  it('a member CAN get() the community document', async () => {
    const member = testEnv.authenticatedContext(MEMBER_UID)
    await assertSucceeds(member.firestore().collection('communities').doc(COMMUNITY_ID).get())
  })
})
