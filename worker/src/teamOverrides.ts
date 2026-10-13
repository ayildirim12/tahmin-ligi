/**
 * Highlightly's `team.name` is unreliable for display: some clubs come back with the name
 * romanized/stripped of Turkish diacritics (e.g. "Besiktas", "Fenerbahce", "Goztepe"), and at
 * least two are outright stale post-rename ("Gazişehir Gaziantep" instead of "Gaziantep FK",
 * "Yeni Çorumspor" instead of "Çorum FK" — same staleness pattern already found in crest URLs,
 * see teams.ts). shortName was previously auto-derived as `name.slice(0,3).toUpperCase()`,
 * which both inherits that staleness AND mis-cases Turkish dotted/dotless İ (JS's default
 * toUpperCase() turns "i" into ASCII "I", not Turkish "İ").
 *
 * So: a hand-curated, hardcoded override per known team id, verified current as of the
 * 2026-27 season. The big four get their universally-recognized broadcast abbreviations
 * (GS/FB/BJK/TS) rather than a mechanically-derived one. Keyed by Highlightly's numeric team
 * id (string) == the `teams/{id}` Firestore doc id.
 *
 * A team id NOT in this map (a future promotion/relegation swap) falls back to the raw API
 * name/derived shortName in teams.ts — better a rough auto-derived label than no data at all.
 */
export const TEAM_OVERRIDES: Record<string, { name: string; shortName: string }> = {
  '549679': { name: 'Galatasaray', shortName: 'GS' },
  '520745': { name: 'Fenerbahçe', shortName: 'FB' },
  '467983': { name: 'Beşiktaş', shortName: 'BJK' },
  '850082': { name: 'Trabzonspor', shortName: 'TS' },
  '3041407': { name: 'Gaziantep FK', shortName: 'GAZ' },
  '3046513': { name: 'Amed', shortName: 'AME' },
  '3054172': { name: 'Eyüpspor', shortName: 'EYÜ' },
  '3066937': { name: 'Samsunspor', shortName: 'SAM' },
  '480748': { name: 'Başakşehir', shortName: 'BAŞ' },
  '517341': { name: 'Konyaspor', shortName: 'KON' },
  '5398677': { name: 'Çorum FK', shortName: 'ÇOR' },
  '6307545': { name: 'Kocaelispor', shortName: 'KOC' },
  '846678': { name: 'Göztepe', shortName: 'GÖZ' },
  '848380': { name: 'Alanyaspor', shortName: 'ALA' },
  '849231': { name: 'Gençlerbirliği', shortName: 'GEN' },
  '855188': { name: 'Kasımpaşa', shortName: 'KAS' },
  '857741': { name: 'Çaykur Rizespor', shortName: 'RİZ' },
  '859443': { name: 'Erzurumspor', shortName: 'ERZ' },
  // ---- UEFA Champions League 2026-27 league-stage clubs (Highlightly ids). Same reasoning as
  // above: an explicit short code instead of `name.slice(0, 3)` (which makes both Manchester
  // clubs "MAN"). Galatasaray/Fenerbahçe are in the Süper Lig block above and are shared.
  '73119': { name: 'Paris Saint-Germain', shortName: 'PSG' },
  '134391': { name: 'Bayern Münih', shortName: 'BAY' },
  '450963': { name: 'Barcelona', shortName: 'BAR' },
  '28867': { name: 'Manchester United', shortName: 'MUN' },
  '762429': { name: 'Como', shortName: 'COM' },
  '147156': { name: 'Stuttgart', shortName: 'STU' },
  '194812': { name: 'Sporting', shortName: 'SPO' },
  '43334': { name: 'Manchester City', shortName: 'MCI' },
  '56950': { name: 'Aston Villa', shortName: 'AVL' },
  '99500': { name: 'Lens', shortName: 'LEN' },
  '462877': { name: 'Real Betis', shortName: 'BET' },
  '141199': { name: 'Borussia Dortmund', shortName: 'BVB' },
  '34824': { name: 'Liverpool', shortName: 'LIV' },
  '461175': { name: 'Real Madrid', shortName: 'RMA' },
  '36526': { name: 'Arsenal', shortName: 'ARS' },
  '490109': { name: 'AEK Atina', shortName: 'AEK' },
  '423731': { name: 'Roma', shortName: 'ROM' },
  '468834': { name: 'Shakhtar Donetsk', shortName: 'SHA' },
  '168431': { name: 'PSV', shortName: 'PSV' },
  '454367': { name: 'Villarreal', shortName: 'VIL' },
  '68013': { name: 'Lille', shortName: 'LIL' },
  '477344': { name: 'Slavia Prag', shortName: 'SLP' },
  '485003': { name: 'Club Brugge', shortName: 'BRU' },
  '430539': { name: 'Inter', shortName: 'INT' },
  '451814': { name: 'Atlético Madrid', shortName: 'ATM' },
  '419476': { name: 'Napoli', shortName: 'NAP' },
  '873910': { name: 'LASK', shortName: 'LAS' },
  '646693': { name: 'Viking', shortName: 'VIK' },
  '181196': { name: 'Porto', shortName: 'POR' },
  '148007': { name: 'RB Leipzig', shortName: 'RBL' },
  '178643': { name: 'Feyenoord', shortName: 'FEY' },
  '11894360': { name: 'Sabah', shortName: 'SAB' },
  '559040': { name: 'Slovan Bratislava', shortName: 'SLO' },
  '279061': { name: 'Bodø/Glimt', shortName: 'BOD' },
}
