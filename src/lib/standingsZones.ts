/**
 * Süper Lig European-qualification / relegation zone bands, purely for the
 * colored left-edge indicator on the standings table. Adjust the position
 * ranges here if the federation changes slot allocation for a season — this
 * is presentation-only and never affects points/order, which come straight
 * from the synced table.
 */
export interface ZoneBand {
  from: number
  to: number
  color: string
  label: string
}

export const ZONE_BANDS: ZoneBand[] = [
  { from: 1, to: 1, color: 'var(--color-primary)', label: 'UEFA Şampiyonlar Ligi grup aşaması' },
  { from: 2, to: 3, color: '#f59e0b', label: 'Avrupa Ligi eleme turu' },
  { from: 4, to: 4, color: '#22c55e', label: 'Avrupa Konferans Ligi eleme turu' },
  { from: 16, to: 18, color: 'var(--color-destructive)', label: 'Küme düşme' },
]

export function zoneForPosition(position: number): ZoneBand | null {
  return ZONE_BANDS.find((z) => position >= z.from && position <= z.to) ?? null
}
