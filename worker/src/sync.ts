import { Timestamp } from 'firebase-admin/firestore'
import { db } from './firestoreAdmin.ts'
import { syncFixtures } from './fixtures.ts'
import { finalizeFinishedMatches } from './finalize.ts'
import { fetchLeagueFixtures } from './highlightlyApi.ts'
import { runLockMaintenance } from './lock.ts'
import { hasImminentOrLiveMatch, LIVE_WINDOW_MINUTES, remainingLiveMinutesToday } from './liveWindow.ts'
import { pollLiveScores, turkeyYmd } from './live.ts'
import {
  computeIntervalSeconds,
  DAILY_BUDGET,
  getQuotaState,
  LIVE_BUDGET,
  markLivePoll,
  markStaleCheck,
  QuotaExhaustedError,
} from './quota.ts'
import { syncStandings } from './standings.ts'
import { syncTeams } from './teams.ts'

const RUN_BUDGET_MS = 4.5 * 60_000 // stay under the 5-minute cron cadence
const FIXTURE_SYNC_INTERVAL_MS = 24 * 60 * 60_000
// Was 2h; now mostly a safety-net fallback since match-finish already triggers an immediate
// resync (see the live loop below) — this only still matters if a finish is somehow never
// observed live (e.g. a cron outage swallowed that match's whole live window).
const STANDINGS_SYNC_INTERVAL_MS = 8 * 60 * 60_000
// A match whose live window ended while it was still SCHEDULED/LIVE/HT in Firestore (quota ran
// out mid-match, cron outage...) is re-fetched by date at most this often, for this long.
const STALE_CHECK_INTERVAL_MS = 2 * 60 * 60_000
const STALE_LOOKBACK_MS = 36 * 60 * 60_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runDueHousekeeping(): Promise<void> {
  const configSnap = await db.collection('meta').doc('config').get()
  const data = configSnap.data()
  const now = Date.now()

  const lastFixtureSync = data?.lastFixtureSyncAt?.toMillis?.() ?? 0
  const lastStandingsSync = data?.lastStandingsSyncAt?.toMillis?.() ?? 0

  if (now - lastFixtureSync > FIXTURE_SYNC_INTERVAL_MS) {
    console.log('Syncing teams + fixtures...')
    const fixtures = await fetchLeagueFixtures()
    await syncTeams(fixtures)
    await syncFixtures(fixtures)
  }

  if (now - lastStandingsSync > STANDINGS_SYNC_INTERVAL_MS) {
    console.log('Syncing standings...')
    await syncStandings()
  }
}

async function getLiveCandidates() {
  // Matches that could be live now or start later today. Querying the whole table for
  // status in (SCHEDULED, LIVE, HT) re-read the entire remaining season on every run.
  const now = Date.now()
  const snap = await db
    .collection('matches')
    .where('kickoffAt', '>', Timestamp.fromMillis(now - 4 * 60 * 60_000))
    .where('kickoffAt', '<', Timestamp.fromMillis(now + 24 * 60 * 60_000))
    .get()
  return snap.docs
    .filter((d) => ['SCHEDULED', 'LIVE', 'HT'].includes(d.data().status))
    .map((d) => ({
      kickoffAtMs: d.data().kickoffAt.toMillis(),
      status: d.data().status as string,
    }))
}

/** Runs an API-consuming step; a spent quota just skips it instead of failing the whole run. */
async function quotaSafe(label: string, step: () => Promise<void>): Promise<void> {
  try {
    await step()
  } catch (err) {
    if (!(err instanceof QuotaExhaustedError)) throw err
    console.warn(`[sync] ${label} skipped — ${err.message}`)
  }
}

async function handleNewlyFinished(matchIds: string[]): Promise<void> {
  if (matchIds.length === 0) return
  console.log(`[sync] finalizing newly-finished matches: ${matchIds.join(', ')}`)
  await finalizeFinishedMatches(matchIds)
  await runLockMaintenance()
  // Standings otherwise only refresh on the 8-hour housekeeping timer. Matches finishing in
  // the same poll are batched, so this is one request per distinct finishing moment.
  console.log('[sync] refreshing standings after match finish')
  await quotaSafe('standings refresh', syncStandings)
}

/**
 * Matches whose live window has passed but which never got a FINISHED status (typically: the
 * daily quota ran out mid-match). Without this they'd sit as "LIVE" until the next 24h fixture
 * sync. Re-fetches each affected Turkey-local date once per STALE_CHECK_INTERVAL_MS.
 */
async function recoverStaleMatches(): Promise<void> {
  const now = Date.now()
  const snap = await db
    .collection('matches')
    .where('kickoffAt', '>', Timestamp.fromMillis(now - STALE_LOOKBACK_MS))
    .where('kickoffAt', '<', Timestamp.fromMillis(now - LIVE_WINDOW_MINUTES * 60_000))
    .get()
  const stale = snap.docs.filter((d) => ['SCHEDULED', 'LIVE', 'HT'].includes(d.data().status))
  if (stale.length === 0) return

  const { lastStaleCheckAtMs, requestsUsedToday } = await getQuotaState()
  if (requestsUsedToday >= DAILY_BUDGET) return // retry once the quota resets
  if (now - lastStaleCheckAtMs < STALE_CHECK_INTERVAL_MS) return
  await markStaleCheck()

  const dates = [...new Set(stale.map((d) => turkeyYmd(d.data().kickoffAt.toMillis())))]
  console.log(`[sync] re-fetching ${stale.length} stale match(es) for ${dates.join(', ')}`)
  const finished: string[] = []
  for (const date of dates) {
    const { newlyFinishedMatchIds } = await pollLiveScores(date)
    finished.push(...newlyFinishedMatchIds)
  }
  await handleNewlyFinished(finished)
}

async function main() {
  console.log(`[sync] run started ${new Date().toISOString()}`)
  const startedAt = Date.now()

  await quotaSafe('housekeeping', runDueHousekeeping)
  await runLockMaintenance()
  await finalizeFinishedMatches()
  await quotaSafe('stale match recovery', recoverStaleMatches)

  let candidates = await getLiveCandidates()

  if (!hasImminentOrLiveMatch(candidates)) {
    console.log('[sync] no live/imminent match — quiet run, exiting.')
    return
  }

  console.log('[sync] live window active — entering adaptive poll loop.')
  try {
    while (Date.now() - startedAt < RUN_BUDGET_MS) {
      // Polls are paced ACROSS runs (lastLivePollAt is persisted): with a fixed one-poll-per-run
      // floor, a 4-match day (~9-10 live hours) needs ~115 polls and blew the 100/day limit.
      const { requestsUsedToday, lastLivePollAtMs } = await getQuotaState()
      if (requestsUsedToday >= LIVE_BUDGET) {
        console.log(`[sync] live budget spent (${requestsUsedToday} used today) — no more live polls today.`)
        break
      }
      const intervalSeconds = computeIntervalSeconds(remainingLiveMinutesToday(candidates), requestsUsedToday)
      const waitMs = lastLivePollAtMs + intervalSeconds * 1000 - Date.now()
      if (waitMs > 0) {
        if (Date.now() + waitMs - startedAt > RUN_BUDGET_MS) {
          console.log(`[sync] next poll due in ${Math.round(waitMs / 1000)}s (interval ${intervalSeconds}s, ${requestsUsedToday} used today) — leaving it to a later run.`)
          break
        }
        console.log(`[sync] sleeping ${Math.round(waitMs / 1000)}s before next poll (interval ${intervalSeconds}s, ${requestsUsedToday} used today)`)
        await sleep(waitMs)
      }

      await markLivePoll()
      const { newlyFinishedMatchIds } = await pollLiveScores()
      await handleNewlyFinished(newlyFinishedMatchIds)

      candidates = await getLiveCandidates()
      if (!hasImminentOrLiveMatch(candidates)) {
        console.log('[sync] all matches settled — exiting loop early.')
        break
      }
    }
  } catch (err) {
    if (!(err instanceof QuotaExhaustedError)) throw err
    console.warn(`[sync] live polling stopped — ${err.message}`)
  }

  await runLockMaintenance()
  await finalizeFinishedMatches()
  console.log('[sync] run finished.')
}

main().catch((err) => {
  console.error('[sync] fatal error:', err)
  process.exitCode = 1
})
