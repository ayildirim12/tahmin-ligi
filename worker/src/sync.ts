import { Timestamp } from 'firebase-admin/firestore'
import { db } from './firestoreAdmin.ts'
import { ALL_COMPETITIONS, competitionOf, type Competition } from './competitions.ts'
import { planFixtures, syncFixtures } from './fixtures.ts'
import { finalizeFinishedMatches } from './finalize.ts'
import { fetchLeagueFixtures } from './highlightlyApi.ts'
import { runLockMaintenance } from './lock.ts'
import { activeKickoffDates, hasImminentOrLiveMatch, remainingLiveMinutesToday } from './liveWindow.ts'
import { pollLiveScores } from './live.ts'
import { computeIntervalSeconds, getRequestsUsedToday } from './quota.ts'
import { syncStandings } from './standings.ts'
import { syncTeams } from './teams.ts'

const RUN_BUDGET_MS = 4.5 * 60_000 // stay under the 5-minute cron cadence
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runDueHousekeeping(): Promise<void> {
  for (const competition of ALL_COMPETITIONS) {
    // One competition failing (e.g. an unexpected API shape) must not stop the others.
    try {
      await runDueHousekeepingFor(competition)
    } catch (err) {
      console.error(`[sync] housekeeping failed for ${competition.id}:`, err)
    }
  }
}

async function runDueHousekeepingFor(competition: Competition): Promise<void> {
  const configSnap = await db.collection('meta').doc(competition.metaDocId).get()
  const data = configSnap.data()
  const now = Date.now()

  const lastFixtureSync = data?.lastFixtureSyncAt?.toMillis?.() ?? 0
  const lastStandingsSync = data?.lastStandingsSyncAt?.toMillis?.() ?? 0

  if (now - lastFixtureSync > competition.fixtureSyncIntervalMs) {
    console.log(`Syncing teams + fixtures (${competition.id})...`)
    const fixtures = await fetchLeagueFixtures(competition.leagueId)
    const { planned, stages } = planFixtures(fixtures, competition)
    if (planned.length === 0) {
      console.warn(`[sync] ${competition.id}: no playable fixtures found — skipping`)
    } else {
      await syncTeams(planned.map((p) => p.fixture))
      await syncFixtures(planned, stages, competition)
    }
  }

  // Standings are refreshed on a slow timer as a fallback; the live loop also refreshes them
  // right after a match of this competition finishes.
  if (now - lastStandingsSync > competition.standingsSyncIntervalMs && data?.lastFixtureSyncAt) {
    console.log(`Syncing standings (${competition.id})...`)
    await syncStandings(competition)
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
      competition: competitionOf(d.data()) as string,
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
    // Competitions with a match in (or about to enter) its live window. Each costs one request
    // per poll, so the interval is stretched by their count to stay inside the daily budget.
    const active = ALL_COMPETITIONS.filter((c) =>
      hasImminentOrLiveMatch(candidates.filter((x) => x.competition === c.id)),
    )
    const intervalSeconds = Math.min(
      300,
      computeIntervalSeconds(remainingMinutes, requestsUsedToday) * Math.max(1, active.length),
    )

    const finishedByCompetition = new Map<Competition, string[]>()
    for (const competition of active) {
      const dates = activeKickoffDates(candidates.filter((x) => x.competition === competition.id))
      const { newlyFinishedMatchIds } = await pollLiveScores(competition, dates)
      if (newlyFinishedMatchIds.length > 0) finishedByCompetition.set(competition, newlyFinishedMatchIds)
    }

    const newlyFinishedMatchIds = [...finishedByCompetition.values()].flat()
    if (newlyFinishedMatchIds.length > 0) {
      console.log(`[sync] finalizing newly-finished matches: ${newlyFinishedMatchIds.join(', ')}`)
      await finalizeFinishedMatches(newlyFinishedMatchIds)
      await runLockMaintenance()
      // Standings (O/G/B/M/AV/P/Son5) otherwise only refresh on the slow housekeeping timer —
      // a match finishing shouldn't have to wait for that to move a team's position/points.
      // Matches that finish within the same poll tick are batched, so this is one extra request
      // per *distinct finishing moment* per competition, not one per match.
      for (const competition of finishedByCompetition.keys()) {
        console.log(`[sync] refreshing standings after match finish (${competition.id})`)
        await syncStandings(competition)
      }
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
