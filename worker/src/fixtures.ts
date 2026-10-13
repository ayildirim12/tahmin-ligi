import { Timestamp } from 'firebase-admin/firestore'
import { config } from './config.ts'
import type { Competition } from './competitions.ts'
import type { HlMatch } from './highlightlyApi.ts'
import { db } from './firestoreAdmin.ts'
import { mapApiStatus, parseScore } from './statusMap.ts'
import { planUclFixtures, type PlannedFixture, type UclStage } from './ucl.ts'

function parseRound(round: string): number {
  const match = round.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function fixtureToMatchDoc(fixture: HlMatch, competition: Competition, gameweek: number) {
  const status = mapApiStatus(fixture.state.description)
  const { home, away } = parseScore(fixture.state.score.current)

  return {
    competition: competition.id,
    apiFixtureId: fixture.id,
    season: String(fixture.league.season),
    gameweek,
    homeTeamId: String(fixture.homeTeam.id),
    awayTeamId: String(fixture.awayTeam.id),
    kickoffAt: Timestamp.fromDate(new Date(fixture.date)),
    status,
    liveHomeGoals: home,
    liveAwayGoals: away,
    finalHomeGoals: status === 'FINISHED' ? home : null,
    finalAwayGoals: status === 'FINISHED' ? away : null,
    elapsedMinutes: fixture.state.clock,
    lastSyncedAt: Timestamp.now(),
  }
}

/**
 * Which fixtures of a competition are part of the game, and the gameweek each belongs to.
 * Süper Lig: every fixture, gameweek = its round number. Champions League: league stage and
 * knockouts only (see ucl.ts), gameweek = our own stage numbering.
 */
export function planFixtures(
  fixtures: HlMatch[],
  competition: Competition,
): { planned: PlannedFixture[]; stages: UclStage[] | null } {
  if (competition.id === 'ucl') return planUclFixtures(fixtures)
  return { planned: fixtures.map((fixture) => ({ fixture, gameweek: parseRound(fixture.round) })), stages: null }
}

/**
 * Full-season fixture list sync — run on the low-frequency housekeeping cadence, not every
 * tick. Takes an already-planned fixture list (shared with syncTeams, which always runs in
 * the same breath — see sync.ts) rather than fetching its own copy.
 */
export async function syncFixtures(
  planned: PlannedFixture[],
  stages: UclStage[] | null,
  competition: Competition,
): Promise<{ currentGameweek: number }> {
  // A Firestore batch holds at most 500 writes.
  for (let i = 0; i < planned.length; i += 400) {
    const batch = db.batch()
    for (const { fixture, gameweek } of planned.slice(i, i + 400)) {
      const ref = db.collection('matches').doc(String(fixture.id))
      batch.set(ref, fixtureToMatchDoc(fixture, competition, gameweek), { merge: true })
    }
    await batch.commit()
  }

  const currentGameweek = inferCurrentGameweek(planned)
  await db
    .collection('meta')
    .doc(competition.metaDocId)
    .set(
      {
        season: config.season,
        currentGameweek,
        ...(stages ? { stages } : {}),
        lastFixtureSyncAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    )

  return { currentGameweek }
}

/** The "current" gameweek is the earliest one that isn't fully finished yet, falling back to the last if the season is over. */
function inferCurrentGameweek(planned: PlannedFixture[]): number {
  const byGameweek = new Map<number, PlannedFixture[]>()
  for (const p of planned) {
    const list = byGameweek.get(p.gameweek) ?? []
    list.push(p)
    byGameweek.set(p.gameweek, list)
  }

  const gameweeks = [...byGameweek.keys()].sort((a, b) => a - b)
  for (const gw of gameweeks) {
    const allFinished = byGameweek.get(gw)!.every((p) => mapApiStatus(p.fixture.state.description) === 'FINISHED')
    if (!allFinished) return gw
  }
  return gameweeks.at(-1) ?? 1
}
