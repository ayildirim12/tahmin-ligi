/**
 * LOCAL EMULATOR ONLY — seeds a handful of teams, one gameweek of matches in
 * varied states (finished / live / scheduled), a standings snapshot, and
 * meta/config, so the app is visually testable end-to-end without needing a
 * real API-Football key yet. Never run this against production (it will
 * refuse to unless FIRESTORE_EMULATOR_HOST is set).
 */
import { Timestamp } from 'firebase-admin/firestore'
import { db } from '../firestoreAdmin.ts'

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Refusing to run localSeed outside the Firestore emulator.')
}

const teams = [
  { id: '1', name: 'Galatasaray', shortName: 'GS' },
  { id: '2', name: 'Fenerbahçe', shortName: 'FB' },
  { id: '3', name: 'Beşiktaş', shortName: 'BJK' },
  { id: '4', name: 'Trabzonspor', shortName: 'TS' },
  { id: '5', name: 'Kocaelispor', shortName: 'KCS' },
  { id: '6', name: 'Samsunspor', shortName: 'SAM' },
]

async function main() {
  const teamBatch = db.batch()
  for (const team of teams) {
    teamBatch.set(db.collection('teams').doc(team.id), {
      apiTeamId: Number(team.id),
      name: team.name,
      shortName: team.shortName,
      crestUrl: '',
    })
  }
  await teamBatch.commit()

  const now = Date.now()
  const matches = [
    {
      id: 'm1',
      gameweek: 1,
      homeTeamId: '1',
      awayTeamId: '2',
      kickoffAt: now - 2 * 60 * 60_000,
      status: 'FINISHED' as const,
      finalHomeGoals: 2,
      finalAwayGoals: 1,
      liveHomeGoals: 2,
      liveAwayGoals: 1,
      pointsFinalized: false,
    },
    {
      id: 'm2',
      gameweek: 1,
      homeTeamId: '3',
      awayTeamId: '4',
      kickoffAt: now - 30 * 60_000,
      status: 'LIVE' as const,
      finalHomeGoals: null,
      finalAwayGoals: null,
      liveHomeGoals: 1,
      liveAwayGoals: 1,
      pointsFinalized: false,
    },
    {
      id: 'm3',
      gameweek: 1,
      homeTeamId: '5',
      awayTeamId: '6',
      kickoffAt: now + 2 * 60 * 60_000,
      status: 'SCHEDULED' as const,
      finalHomeGoals: null,
      finalAwayGoals: null,
      liveHomeGoals: null,
      liveAwayGoals: null,
      pointsFinalized: false,
    },
  ]

  const matchBatch = db.batch()
  for (const m of matches) {
    matchBatch.set(db.collection('matches').doc(m.id), {
      apiFixtureId: Number(m.id.replace('m', '')),
      season: '2026',
      gameweek: m.gameweek,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      kickoffAt: Timestamp.fromMillis(m.kickoffAt),
      status: m.status,
      liveHomeGoals: m.liveHomeGoals,
      liveAwayGoals: m.liveAwayGoals,
      finalHomeGoals: m.finalHomeGoals,
      finalAwayGoals: m.finalAwayGoals,
      elapsedMinutes: m.status === 'LIVE' ? 34 : null,
      lastSyncedAt: Timestamp.now(),
      pointsFinalized: m.pointsFinalized,
    })
  }
  await matchBatch.commit()

  await db.collection('meta').doc('config').set({
    season: '2026',
    currentGameweek: 1,
    lastFixtureSyncAt: Timestamp.now(),
    lastStandingsSyncAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  await db
    .collection('standings')
    .doc('superlig')
    .set({
      updatedAt: Timestamp.now(),
      rows: teams.map((team, i) => ({
        teamId: team.id,
        position: i + 1,
        played: 6,
        won: 6 - i,
        drawn: 0,
        lost: i,
        goalsFor: 15 - i,
        goalsAgainst: 4 + i,
        goalDiff: 15 - i - (4 + i),
        points: (6 - i) * 3,
        form: ['W', 'W', 'D', 'L', 'W'] as const,
      })),
    })

  console.log('Local emulator seed complete: 6 teams, 3 matches (finished/live/scheduled), standings, config.')
}

main().then(() => process.exit(0))
