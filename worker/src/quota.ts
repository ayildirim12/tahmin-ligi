import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { db } from './firestoreAdmin.ts'

const QUOTA_DOC = db.collection('syncState').doc('highlightlyQuota')
export const DAILY_BUDGET = 100
const HOUSEKEEPING_RESERVE = 10
export const LIVE_BUDGET = DAILY_BUDGET - HOUSEKEEPING_RESERVE
// Upper bound on the gap between live polls once the budget gets tight. Polls are paced
// ACROSS runs (via lastLivePollAt), so this can exceed the 5-minute cron cadence.
const MAX_INTERVAL_SECONDS = 30 * 60

/** Thrown instead of making a request once today's budget is spent (or Highlightly says 429). */
export class QuotaExhaustedError extends Error {
  constructor(message = 'Highlightly daily quota exhausted') {
    super(message)
    this.name = 'QuotaExhaustedError'
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
}

export interface QuotaState {
  requestsUsedToday: number
  lastLivePollAtMs: number
  lastStaleCheckAtMs: number
}

/** Reads today's quota state, resetting the counter first if the stored date has rolled over. */
export async function getQuotaState(): Promise<QuotaState> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(QUOTA_DOC)
    const data = snap.data()
    const lastLivePollAtMs = data?.lastLivePollAt?.toMillis?.() ?? 0
    const lastStaleCheckAtMs = data?.lastStaleCheckAt?.toMillis?.() ?? 0
    if (!snap.exists || data?.date !== todayKey()) {
      tx.set(QUOTA_DOC, { date: todayKey(), requestsUsedToday: 0, updatedAt: Timestamp.now() }, { merge: true })
      return { requestsUsedToday: 0, lastLivePollAtMs, lastStaleCheckAtMs }
    }
    return { requestsUsedToday: data?.requestsUsedToday ?? 0, lastLivePollAtMs, lastStaleCheckAtMs }
  })
}

/**
 * Reserves one request against today's budget BEFORE it is made. Throws QuotaExhaustedError
 * (without counting) if the full daily budget is already spent — so once we hit the limit we
 * stop hitting Highlightly entirely instead of collecting a 429 every 5 minutes.
 */
export async function reserveApiRequest(): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(QUOTA_DOC)
    if (!snap.exists || snap.data()?.date !== todayKey()) {
      tx.set(QUOTA_DOC, { date: todayKey(), requestsUsedToday: 1, updatedAt: Timestamp.now() }, { merge: true })
      return
    }
    if ((snap.data()?.requestsUsedToday ?? 0) >= DAILY_BUDGET) throw new QuotaExhaustedError()
    tx.update(QUOTA_DOC, { requestsUsedToday: FieldValue.increment(1), updatedAt: Timestamp.now() })
  })
}

/** Highlightly itself said we're over the limit — pin our counter so nothing else tries today. */
export async function markQuotaExhausted(): Promise<void> {
  await QUOTA_DOC.set(
    { date: todayKey(), requestsUsedToday: DAILY_BUDGET, updatedAt: Timestamp.now() },
    { merge: true },
  )
}

export async function markLivePoll(): Promise<void> {
  await QUOTA_DOC.set({ lastLivePollAt: Timestamp.now() }, { merge: true })
}

export async function markStaleCheck(): Promise<void> {
  await QUOTA_DOC.set({ lastStaleCheckAt: Timestamp.now() }, { merge: true })
}

/**
 * How long to wait between live polls, given how many live-minutes remain today (across all
 * matches, concurrent windows merged into one) and how much of the live budget is left —
 * i.e. spread what's left evenly over what's left. On a heavy day (e.g. 4 staggered Sunday
 * matches ≈ 9-10 live hours) this is > 5 minutes, which is why polls are paced across cron
 * runs: a fixed one-poll-per-run floor burned the whole 100/day before the last match ended.
 * The 7s floor is a self-imposed minimum, not a documented rate limit.
 */
export function computeIntervalSeconds(remainingLiveMinutesToday: number, requestsUsedToday: number): number {
  const remainingBudget = LIVE_BUDGET - requestsUsedToday
  if (remainingBudget <= 0) return Infinity
  if (remainingLiveMinutesToday <= 0) return 300

  const raw = (remainingLiveMinutesToday * 60) / remainingBudget
  return Math.min(MAX_INTERVAL_SECONDS, Math.max(7, Math.round(raw)))
}
