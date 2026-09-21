import { Timestamp } from 'firebase-admin/firestore'
import { config } from './config.ts'
import { fetchLeagueFixtures, type HlMatch } from './highlightlyApi.ts'
import { db } from './firestoreAdmin.ts'
import { mapApiStatus, parseScore } from './statusMap.ts'

function parseRound(round: string): number {
  const match = round.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function fixtureToMatchDoc(fixture: HlMatch) {
  const status = mapApiStatus(fixture.state.description)
  const { home, away } = parseScore(fixture.state.score.current)

  return {
    apiFixtureId: fixture.id,
    season: String(fixture.league.season),
    gameweek: parseRound(fixture.round),
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

/** Full-season fixture list sync — run on the low-frequency housekeeping cadence, not every tick. */
export async function syncFixtures(): Promise<{ currentGameweek: number }> {
  const fixtures = await fetchLeagueFixtures()
  const batch = db.batch()

  for (const fixture of fixtures) {
    const ref = db.collection('matches').doc(String(fixture.id))
    batch.set(ref, fixtureToMatchDoc(fixture), { merge: true })
  }
  await batch.commit()

  const currentGameweek = inferCurrentGameweek(fixtures)
  await db
    .collection('meta')
    .doc('config')
    .set(
      { season: config.season, currentGameweek, lastFixtureSyncAt: Timestamp.now(), updatedAt: Timestamp.now() },
      { merge: true },
    )

  return { currentGameweek }
}

/** The "current" gameweek is the earliest round that isn't fully finished yet, falling back to the last round if the season is over. */
function inferCurrentGameweek(fixtures: HlMatch[]): number {
  const byRound = new Map<number, HlMatch[]>()
  for (const fixture of fixtures) {
    const round = parseRound(fixture.round)
    const list = byRound.get(round) ?? []
    list.push(fixture)
    byRound.set(round, list)
  }

  const rounds = [...byRound.keys()].sort((a, b) => a - b)
  for (const round of rounds) {
    const matches = byRound.get(round)!
    const allFinished = matches.every((m) => mapApiStatus(m.state.description) === 'FINISHED')
    if (!allFinished) return round
  }
  return rounds.at(-1) ?? 1
}
