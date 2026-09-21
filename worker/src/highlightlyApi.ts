import { config, requireHighlightlyKey } from './config.ts'

// Direct (non-RapidAPI) Highlightly access — only needs the API key header.
// https://highlightly.net/football-api/documentation/
const BASE_URL = 'https://soccer.highlightly.net'

interface PaginatedResponse<T> {
  data: T[]
  pagination?: { limit: number; offset: number; total?: number }
}

async function call<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))

  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': requireHighlightlyKey() },
  })

  if (!res.ok) {
    throw new Error(`Highlightly ${path} failed: ${res.status} ${await res.text()}`)
  }

  return res.json() as Promise<T>
}

/**
 * `/matches` paginates (max 100/page). Loops until a short page signals the end.
 * Shape of each match is UNVERIFIED against a real API key — see worker/AGENTS.md §4.
 */
async function fetchAllPages<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
  const pageSize = 100
  const results: T[] = []
  let offset = 0

  for (;;) {
    const page = await call<PaginatedResponse<T>>(path, { ...params, limit: pageSize, offset })
    const items = page.data ?? []
    results.push(...items)
    if (items.length < pageSize) break
    offset += pageSize
  }

  return results
}

export interface HlTeam {
  id: number
  name: string
  logo: string
  type: string
}

export interface HlMatch {
  id: number
  round: string
  date: string // ISO 8601
  homeTeam: HlTeam
  awayTeam: HlTeam
  league: { id: number; season: number; name: string; logo: string }
  state: {
    description: string
    clock: number | null
    score: { current: string | null; penalties?: string }
  }
}

export function fetchLeagueFixtures(): Promise<HlMatch[]> {
  return fetchAllPages<HlMatch>('/matches', { leagueId: config.leagueId, season: config.season })
}

/**
 * No global "live=all" endpoint exists on Highlightly (unlike API-Football) — matches
 * must be queried per league + date. Since we only ever care about Süper Lig, this is
 * still exactly one request per poll: one league's matches for one date naturally
 * includes every concurrently-live match in that league. `date` is the caller's
 * responsibility (Turkey-local "today"), formatted YYYY-MM-DD.
 */
export function fetchMatchesForDate(dateYmd: string): Promise<HlMatch[]> {
  return fetchAllPages<HlMatch>('/matches', { leagueId: config.leagueId, date: dateYmd })
}

export interface HlStandingRow {
  position: number
  points: number
  team: { id: number; name: string }
  total: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } }
  // Form is not confirmed present on this endpoint — derive from recent fixtures if absent
  // (see worker/AGENTS.md §4 verification note).
  form?: string
}

export async function fetchStandings(): Promise<HlStandingRow[]> {
  const response = await call<{ groups: Array<{ standings: HlStandingRow[] }> }>('/standings', {
    leagueId: config.leagueId,
    season: config.season,
  })
  return response.groups?.[0]?.standings ?? []
}

/** No dedicated league-filtered /teams endpoint confirmed — derive the team list from fixtures instead (also saves a request). */
export async function fetchLeagueTeams(): Promise<HlTeam[]> {
  const matches = await fetchLeagueFixtures()
  const byId = new Map<number, HlTeam>()
  for (const match of matches) {
    byId.set(match.homeTeam.id, match.homeTeam)
    byId.set(match.awayTeam.id, match.awayTeam)
  }
  return [...byId.values()]
}

/** One-off lookup helper for setup — confirms the real league id to put in SUPERLIG_LEAGUE_ID. */
export function findLeagueId(name: string, countryCode: string) {
  return call<{ data: Array<{ id: number; name: string; country: { code: string; name: string } }> }>(
    '/leagues',
    { name, countryCode },
  )
}
