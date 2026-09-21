import { ZONE_BANDS } from '@/lib/standingsZones'

export function ZoneLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground">
      {ZONE_BANDS.map((zone) => (
        <div key={zone.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: zone.color }} />
          {zone.label}
        </div>
      ))}
    </div>
  )
}
