import { config, requireApiFootballKey } from './config.ts'

const BASE_URL = 'https://v3.football.api-sports.io'

interface ApiFootballResponse<T> {
  response: T[]
  errors: unknown
}

async function call<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))

  const res = await fetch(url, {
    headers: { 'x-apisports-key': requireApiFootballKey() },
  })

  if (!res.ok) {
    throw new Error(`API-Football ${path} failed: ${res.status} ${await res.text()}`)
  }

  const body = (await res.json()) as ApiFootballResponse<T>
  if (body.errors && Object.keys(body.errors).length > 0) {
    throw new Error(`API-Football ${path} returned errors: ${JSON.stringify(body.errors)}`)
  }
  return body.response
}

export interface ApiFixture {
  fixture: {
    id: number
    date: string
    status: { short: string; elapsed: number | null }
  }
  league: { id: number; round: string; season: number }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
  goals: { home: number | null; away: number | null }
}

export function fetchLeagueFixtures() {
  return call<ApiFixture>('/fixtures', { league: config.leagueId, season: config.season })
}

export function fetchLiveFixtures() {
  return call<ApiFixture>('/fixtures', { live: 'all' })
}

export interface ApiStandingRow {
  rank: number
  team: { id: number; name: string }
  points: number
  goalsDiff: number
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: { for: number; against: number }
  }
  form: string // e.g. "WWDLW"
}

export async function fetchStandings(): Promise<ApiStandingRow[]> {
  const response = await call<{ league: { standings: ApiStandingRow[][] } }>('/standings', {
    league: config.leagueId,
    season: config.season,
  })
  return response[0]?.league.standings[0] ?? []
}

export interface ApiTeam {
  team: { id: number; name: string; code: string | null; logo: string }
}

export function fetchLeagueTeams() {
  return call<ApiTeam>('/teams', { league: config.leagueId, season: config.season })
}

/** One-off lookup helper for Phase 0/3 setup — confirms the real league id to put in SUPERLIG_LEAGUE_ID. */
export function findLeagueId(name: string, country: string) {
  return call<{ league: { id: number; name: string }; country: { name: string } }>('/leagues', {
    name,
    country,
  })
}
