import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { db } from './firestoreAdmin.ts'

const QUOTA_DOC = db.collection('syncState').doc('apiFootballQuota')
const DAILY_BUDGET = 100
const HOUSEKEEPING_RESERVE = 10
const LIVE_BUDGET = DAILY_BUDGET - HOUSEKEEPING_RESERVE

function todayKey(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
}

/** Reads today's used count, resetting to 0 first if the stored date has rolled over. */
export async function getRequestsUsedToday(): Promise<number> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(QUOTA_DOC)
    const today = todayKey()
    if (!snap.exists || snap.data()?.date !== today) {
      tx.set(QUOTA_DOC, { date: today, requestsUsedToday: 0, updatedAt: Timestamp.now() })
      return 0
    }
    return snap.data()?.requestsUsedToday ?? 0
  })
}

/** Call once per actual API-Football request made. Transactional so overlapping runs can't double-count. */
export async function recordApiRequest(): Promise<void> {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(QUOTA_DOC)
    const today = todayKey()
    if (!snap.exists || snap.data()?.date !== today) {
      tx.set(QUOTA_DOC, { date: today, requestsUsedToday: 1, updatedAt: Timestamp.now() })
      return
    }
    tx.update(QUOTA_DOC, { requestsUsedToday: FieldValue.increment(1), updatedAt: Timestamp.now() })
  })
}

/**
 * How long to sleep between live polls, given how many live-minutes remain
 * today (across all matches, concurrent windows merged into one) and how
 * much of the daily API-Football budget is left. Floors just above the
 * 10-req/min hard rate limit; ceilings at the outer 5-minute cron cadence
 * (degrading to it is a no-op, not a failure).
 */
export function computeIntervalSeconds(remainingLiveMinutesToday: number, requestsUsedToday: number): number {
  const remainingBudget = Math.max(0, LIVE_BUDGET - requestsUsedToday)
  if (remainingBudget <= 0 || remainingLiveMinutesToday <= 0) return 300

  const raw = (remainingLiveMinutesToday * 60) / remainingBudget
  return Math.min(300, Math.max(7, Math.round(raw)))
}
