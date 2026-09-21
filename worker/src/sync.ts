import { db } from './firestoreAdmin.ts'
import { syncFixtures } from './fixtures.ts'
import { finalizeFinishedMatches } from './finalize.ts'
import { runLockMaintenance } from './lock.ts'
import { hasImminentOrLiveMatch, remainingLiveMinutesToday } from './liveWindow.ts'
import { pollLiveScores } from './live.ts'
import { computeIntervalSeconds, getRequestsUsedToday } from './quota.ts'
import { syncStandings } from './standings.ts'
import { syncTeams } from './teams.ts'

const RUN_BUDGET_MS = 4.5 * 60_000 // stay under the 5-minute cron cadence
const FIXTURE_SYNC_INTERVAL_MS = 24 * 60 * 60_000
const STANDINGS_SYNC_INTERVAL_MS = 2 * 60 * 60_000

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
    await syncTeams()
    await syncFixtures()
  }

  if (now - lastStandingsSync > STANDINGS_SYNC_INTERVAL_MS) {
    console.log('Syncing standings...')
    await syncStandings()
  }
}

async function getLiveCandidates() {
  const snap = await db.collection('matches').where('status', 'in', ['SCHEDULED', 'LIVE', 'HT']).get()
  return snap.docs.map((d) => ({
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
    }

    candidates = await getLiveCandidates()
    if (!hasImminentOrLiveMatch(candidates)) {
      console.log('[sync] all matches settled — exiting loop early.')
      break
    }

    console.log(`[sync] sleeping ${intervalSeconds}s before next poll (requests used today: ${requestsUsedToday})`)
    await sleep(intervalSeconds * 1000)
  }

  await runLockMaintenance()
  await finalizeFinishedMatches()
  console.log('[sync] run finished.')
}

main().catch((err) => {
  console.error('[sync] fatal error:', err)
  process.exitCode = 1
})
