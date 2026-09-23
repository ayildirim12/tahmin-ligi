export type MatchStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'HT'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELLED'

export interface ScoreLine {
  homeGoals: number
  awayGoals: number
}

export interface Team {
  id: string
  apiTeamId: number
  name: string
  shortName: string
}

export interface Match {
  id: string
  apiFixtureId: number
  season: string
  gameweek: number
  homeTeamId: string
  awayTeamId: string
  kickoffAt: number
  status: MatchStatus
  liveHomeGoals: number | null
  liveAwayGoals: number | null
  finalHomeGoals: number | null
  finalAwayGoals: number | null
  elapsedMinutes: number | null
  lastSyncedAt: number
  pointsFinalized: boolean
}

export interface Prediction {
  id: string
  uid: string
  communityId: string
  matchId: string
  homeGoals: number
  awayGoals: number
  createdAt: number
  updatedAt: number
  locked: boolean
  points: number | null
}

export interface CommunityMember {
  uid: string
  displayName: string
  photoURL: string | null
  role: 'owner' | 'member'
  joinedAt: number
  totalPoints: number
  totalPredictions: number
  winsCount: number
  lastUpdatedMatchId: string | null
}

export interface Community {
  id: string
  name: string
  ownerUid: string
  createdAt: number
  updatedAt: number
  inviteCode: string
}

export interface StandingsRow {
  teamId: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  form: Array<'W' | 'D' | 'L'>
}
