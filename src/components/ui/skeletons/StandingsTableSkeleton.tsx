import { Fragment } from 'react'
import { Skeleton } from './Skeleton'

const ROWS = 8
const ROW_HEIGHT = 36
const NUMERIC_COLS = 7 // O, G, B, M, A, Y, AV
const FORM_BADGES = 5

export function StandingsTableSkeleton() {
  const height = ROWS * ROW_HEIGHT

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Skeleton viewBox={`0 0 620 ${height}`} style={{ width: '100%', height: 'auto' }}>
        {Array.from({ length: ROWS }).map((_, i) => {
          const y = i * ROW_HEIGHT
          return (
            <Fragment key={i}>
              <rect x={0} y={y} rx={0} ry={0} width={3} height={ROW_HEIGHT} />
              <rect x={14} y={y + 14} rx={2} ry={2} width={14} height={10} />
              <circle cx={50} cy={y + 18} r={9} />
              <rect x={66} y={y + 13} rx={4} ry={4} width={90} height={10} />
              {Array.from({ length: NUMERIC_COLS }).map((__, col) => (
                <rect key={col} x={200 + col * 34} y={y + 13} rx={2} ry={2} width={14} height={10} />
              ))}
              <rect x={438} y={y + 12} rx={2} ry={2} width={18} height={12} />
              {Array.from({ length: FORM_BADGES }).map((__, badge) => (
                <circle key={badge} cx={486 + badge * 18} cy={y + 18} r={6} />
              ))}
            </Fragment>
          )
        })}
      </Skeleton>
    </div>
  )
}
