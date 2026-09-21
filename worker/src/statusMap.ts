import type { MatchStatus } from '../../src/shared/types.ts'

const LIVE_CODES = new Set(['1H', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'])
const FINISHED_CODES = new Set(['FT', 'AET', 'PEN', 'AWD', 'WO'])
const POSTPONED_CODES = new Set(['PST', 'TBD'])
const CANCELLED_CODES = new Set(['CANC', 'ABD'])

export function mapApiStatus(short: string): MatchStatus {
  if (short === 'HT') return 'HT'
  if (LIVE_CODES.has(short)) return 'LIVE'
  if (FINISHED_CODES.has(short)) return 'FINISHED'
  if (POSTPONED_CODES.has(short)) return 'POSTPONED'
  if (CANCELLED_CODES.has(short)) return 'CANCELLED'
  return 'SCHEDULED'
}
