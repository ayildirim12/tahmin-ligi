function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const config = {
  highlightlyApiKey: process.env.HIGHLIGHTLY_API_KEY ?? '',
  // Highlightly's own numeric league id — UNVERIFIED placeholder, confirm via
  // findLeagueId('Super Lig', 'TR') once a real API key is available (see worker/AGENTS.md §4).
  leagueId: Number(process.env.SUPERLIG_LEAGUE_ID ?? '0'),
  // UEFA Champions League in Highlightly (found via worker/src/discover.ts) — same season number as the league.
  uclLeagueId: Number(process.env.UCL_LEAGUE_ID ?? '2486'),
  season: process.env.SUPERLIG_SEASON ?? String(new Date().getFullYear()),
  usingEmulator: Boolean(process.env.FIRESTORE_EMULATOR_HOST),
}

export function requireHighlightlyKey(): string {
  return required('HIGHLIGHTLY_API_KEY')
}
