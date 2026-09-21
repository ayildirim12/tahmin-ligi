import { Timestamp } from 'firebase-admin/firestore'
import { config } from './config.ts'
import { fetchLeagueFixtures, type ApiFixture } from './apiFootball.ts'
import { db } from './firestoreAdmin.ts'
import { mapApiStatus } from './statusMap.ts'

function parseRound(round: string): number {
  const match = round.match(/(\d+)/)
  return match ? Number(match[1]) : 0
}

function fixtureToMatchDoc(fixture: ApiFixture) {
  return {
    apiFixtureId: fixture.fixture.id,
    season: String(fixture.league.season),
    gameweek: parseRound(fixture.league.round),
    homeTeamId: String(fixture.teams.home.id),
    awayTeamId: String(fixture.teams.away.id),
    kickoffAt: Timestamp.fromDate(new Date(fixture.fixture.date)),
    status: mapApiStatus(fixture.fixture.status.short),
    liveHomeGoals: fixture.goals.home,
    liveAwayGoals: fixture.goals.away,
    finalHomeGoals: mapApiStatus(fixture.fixture.status.short) === 'FINISHED' ? fixture.goals.home : null,
    finalAwayGoals: mapApiStatus(fixture.fixture.status.short) === 'FINISHED' ? fixture.goals.away : null,
    elapsedMinutes: fixture.fixture.status.elapsed,
    lastSyncedAt: Timestamp.now(),
  }
}

/** Full-season fixture list sync — run on the low-frequency housekeeping cadence, not every tick. */
export async function syncFixtures(): Promise<{ currentGameweek: number }> {
  const fixtures = await fetchLeagueFixtures()
  const batch = db.batch()

  for (const fixture of fixtures) {
    const ref = db.collection('matches').doc(String(fixture.fixture.id))
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
function inferCurrentGameweek(fixtures: ApiFixture[]): number {
  const byRound = new Map<number, ApiFixture[]>()
  for (const fixture of fixtures) {
    const round = parseRound(fixture.league.round)
    const list = byRound.get(round) ?? []
    list.push(fixture)
    byRound.set(round, list)
  }

  const rounds = [...byRound.keys()].sort((a, b) => a - b)
  for (const round of rounds) {
    const matches = byRound.get(round)!
    const allFinished = matches.every((m) => mapApiStatus(m.fixture.status.short) === 'FINISHED')
    if (!allFinished) return round
  }
  return rounds.at(-1) ?? 1
}
