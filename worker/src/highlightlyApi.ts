import { config, requireHighlightlyKey } from './config.ts'
import { recordApiRequest } from './quota.ts'

// Direct (non-RapidAPI) Highlightly access — only needs the API key header.
// https://highlightly.net/football-api/documentation/
const BASE_URL = 'https://soccer.highlightly.net'

interface PaginatedResponse<T> {
  data: T[]
  pagination?: { limit: number; offset: number; totalCount?: number }
}

async function call<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))

  const res = await fetch(url, {
    headers: { 'x-rapidapi-key': requireHighlightlyKey() },
  })
  // Recorded here (the one place every Highlightly call funnels through — including each
  // page of a paginated fetch) so the daily quota counter reflects EVERY real request, not
  // just the live-poll loop's own calls. Previously only live.ts recorded usage, so the
  // adaptive live-poll budget was computed blind to what housekeeping (teams/fixtures/
  // standings) had already spent that day, risking a real Highlightly-side overshoot past
  // the 100/day free limit on a heavy match day.
  await recordApiRequest()

  if (!res.ok) {
    throw new Error(`Highlightly ${path} failed: ${res.status} ${await res.text()}`)
  }

  return res.json() as Promise<T>
}

/**
 * `/matches` paginates (max 100/page, confirmed response shape:
 * `{ data: [...], pagination: { limit, offset, totalCount } }`). Stops once `totalCount` is
 * reached, falling back to "short page" detection if `totalCount` is ever missing.
 * Shape of each match item is UNVERIFIED against a real API key — see worker/AGENTS.md §4.
 */
async function fetchAllPages<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
  const pageSize = 100
  const results: T[] = []
  let offset = 0

  for (;;) {
    const page = await call<PaginatedResponse<T>>(path, { ...params, limit: pageSize, offset })
    const items = page.data ?? []
    results.push(...items)

    const totalCount = page.pagination?.totalCount
    if (totalCount !== undefined ? results.length >= totalCount : items.length < pageSize) break
    offset += pageSize
  }

  return results
}

export interface HlTeam {
  id: number
  name: string
  logo: string
  // Confirmed ABSENT on match objects' homeTeam/awayTeam (worker/AGENTS.md §4) — optional here.
  type?: string
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

// Confirmed against a real response (worker/AGENTS.md §4) — note the flat scoredGoals/
// receivedGoals (not nested under a "goals" object like /matches' team objects) and "games"/
// "wins"/"draws"/"loses" (plural, not "played"/"win"/"draw"/"lose" as first guessed).
export interface HlStandingRow {
  position: number
  points: number
  team: { id: number; name: string }
  total: { games: number; wins: number; draws: number; loses: number; scoredGoals: number; receivedGoals: number }
  // Confirmed ABSENT from the real response — always falls back to an empty form array.
  form?: string
}

export async function fetchStandings(): Promise<HlStandingRow[]> {
  const response = await call<{ groups: Array<{ standings: HlStandingRow[] }> }>('/standings', {
    leagueId: config.leagueId,
    season: config.season,
  })
  return response.groups?.[0]?.standings ?? []
}

/**
 * No dedicated league-filtered /teams endpoint confirmed — derive the team list from an
 * already-fetched fixture list instead. Pure (no request of its own) so callers that need
 * both the fixtures AND the team list (syncTeams + syncFixtures, always run together on the
 * same housekeeping cadence — see sync.ts) can share one fetchLeagueFixtures() call instead
 * of each independently re-fetching the same ~150-match season list.
 */
export function deriveTeamsFromFixtures(matches: HlMatch[]): HlTeam[] {
  const byId = new Map<number, HlTeam>()
  for (const match of matches) {
    byId.set(match.homeTeam.id, match.homeTeam)
    byId.set(match.awayTeam.id, match.awayTeam)
  }
  return [...byId.values()]
}

/**
 * One-off lookup helper for setup — confirms the real league id to put in SUPERLIG_LEAGUE_ID.
 * Param names (`leagueName`, `countryCode`) are confirmed from the /leagues docs table.
 */
export function findLeagueId(leagueName: string, countryCode: string) {
  return call<{ data: Array<{ id: number; name: string; country: { code: string; name: string } }> }>(
    '/leagues',
    { leagueName, countryCode },
  )
}
