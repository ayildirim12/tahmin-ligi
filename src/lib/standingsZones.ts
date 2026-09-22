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

// TFF'nin 2026-27 sezonu UEFA katılım duyurusuna göre (bkz. https://x.com/TFF_Org/status/2036455814798413974):
// 1. Şampiyonlar Ligi grup aşaması, 2. Şampiyonlar Ligi 2. eleme turu, 3. Avrupa Ligi 2. eleme
// turu, 4. Konferans Ligi 2. eleme turu. (Türkiye Kupası şampiyonu ayrıca Avrupa Ligi play-off
// turuna gidiyor ama bu lig sırasından bağımsız olduğu için tabloda gösterilmiyor.)
export const ZONE_BANDS: ZoneBand[] = [
  { from: 1, to: 1, color: 'var(--color-primary)', label: 'UEFA Şampiyonlar Ligi (grup aşaması)' },
  { from: 2, to: 2, color: '#3b82f6', label: 'UEFA Şampiyonlar Ligi (2. eleme turu)' },
  { from: 3, to: 3, color: '#f59e0b', label: 'UEFA Avrupa Ligi (2. eleme turu)' },
  { from: 4, to: 4, color: '#22c55e', label: 'UEFA Konferans Ligi (2. eleme turu)' },
  { from: 16, to: 18, color: 'var(--color-destructive)', label: 'Küme düşme' },
]

export function zoneForPosition(position: number): ZoneBand | null {
  return ZONE_BANDS.find((z) => position >= z.from && position <= z.to) ?? null
}
