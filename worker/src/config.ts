function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const config = {
  apiFootballKey: process.env.API_FOOTBALL_KEY ?? '',
  leagueId: Number(process.env.SUPERLIG_LEAGUE_ID ?? '203'), // 203 = API-Football's Süper Lig id — confirm via /leagues lookup during setup
  season: process.env.SUPERLIG_SEASON ?? String(new Date().getFullYear()),
  usingEmulator: Boolean(process.env.FIRESTORE_EMULATOR_HOST),
}

export function requireApiFootballKey(): string {
  return required('API_FOOTBALL_KEY')
}
