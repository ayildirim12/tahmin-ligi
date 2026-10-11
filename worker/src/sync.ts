import { Timestamp } from 'firebase-admin/firestore'
import { db } from './firestoreAdmin.ts'
import { syncFixtures } from './fixtures.ts'
import { finalizeFinishedMatches } from './finalize.ts'
import { fetchLeagueFixtures } from './highlightlyApi.ts'
import { runLockMaintenance } from './lock.ts'
import { hasImminentOrLiveMatch, remainingLiveMinutesToday } from './liveWindow.ts'
import { pollLiveScores } from './live.ts'
import { computeIntervalSeconds, getRequestsUsedToday } from './quota.ts'
import { syncStandings } from './standings.ts'
import { syncTeams } from './teams.ts'

const RUN_BUDGET_MS = 4.5 * 60_000 // stay under the 5-minute cron cadence
const FIXTURE_SYNC_INTERVAL_MS = 24 * 60 * 60_000
// Was 2h; now mostly a safety-net fallback since match-finish already triggers an immediate
// resync (see the live loop below) — this only still matters if a finish is somehow never
// observed live (e.g. a cron outage swallowed that match's whole live window).
const STANDINGS_SYNC_INTERVAL_MS = 8 * 60 * 60_000

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

async function main() {
  console.log(`[sync] run started ${new Date().toISOString()}`)
  const startedAt = Date.now()

  await runDueHousekeeping()
  await runLockMaintenance()
  await finalizeFinishedMatches()

  let candidates = await getLiveCandidates()

  if (!hasImminentOrLiveMatch(candidates)) {
    console.log('[sync] no live/imminent match — quiet run, exiting.')
    return
  }

  console.log('[sync] live window active — entering adaptive poll loop.')
  while (Date.now() - startedAt < RUN_BUDGET_MS) {
    const requestsUsedToday = await getRequestsUsedToday()
    const remainingMinutes = remainingLiveMinutesToday(candidates)
    const intervalSeconds = computeIntervalSeconds(remainingMinutes, requestsUsedToday)

    const { newlyFinishedMatchIds } = await pollLiveScores()
    if (newlyFinishedMatchIds.length > 0) {
      console.log(`[sync] finalizing newly-finished matches: ${newlyFinishedMatchIds.join(', ')}`)
      await finalizeFinishedMatches(newlyFinishedMatchIds)
      await runLockMaintenance()
      // Standings (O/G/B/M/AV/P/Son5) otherwise only refresh on the 2-hour
      // housekeeping timer — a match finishing shouldn't have to wait up to
      // that long to move a team's position/points. Matches that finish
      // within the same poll tick are already batched into one
      // newlyFinishedMatchIds list, so this is naturally one extra request
      // per *distinct finishing moment* during a live window, not one per
      // match — cheap relative to the live-poll budget.
      console.log('[sync] refreshing standings after match finish')
      await syncStandings()
    }

    candidates = await getLiveCandidates()
    if (!hasImminentOrLiveMatch(candidates)) {
      console.log('[sync] all matches settled — exiting loop early.')
      break
    }

    console.log(`[sync] sleeping ${intervalSeconds}s before next poll (requests used today: ${requestsUsedToday})`)
    // Never sleep past the run budget: the job has a hard 5-minute timeout, and an
    // over-long final sleep got the run cancelled before its end-of-run cleanup.
    const msLeft = RUN_BUDGET_MS - (Date.now() - startedAt)
    if (msLeft <= 0) break
    await sleep(Math.min(intervalSeconds * 1000, msLeft))
  }

  await runLockMaintenance()
  await finalizeFinishedMatches()
  console.log('[sync] run finished.')
}

main().catch((err) => {
  console.error('[sync] fatal error:', err)
  process.exitCode = 1
})
