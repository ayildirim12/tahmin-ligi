import { Fragment } from 'react'
import { Skeleton } from './Skeleton'

const ROWS = 6
const ROW_HEIGHT = 44
const HEADER_HEIGHT = 30
const MATCH_COLS = 4

export function LeaderboardMatrixSkeleton() {
  const height = HEADER_HEIGHT + ROWS * ROW_HEIGHT

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Skeleton viewBox={`0 0 520 ${height}`} style={{ width: '100%', height: 'auto' }}>
        {Array.from({ length: MATCH_COLS }).map((_, col) => (
          <circle key={col} cx={200 + col * 40} cy={HEADER_HEIGHT / 2} r={9} />
        ))}
        <rect x={410} y={HEADER_HEIGHT / 2 - 5} rx={3} ry={3} width={28} height={10} />
        <rect x={460} y={HEADER_HEIGHT / 2 - 5} rx={3} ry={3} width={36} height={10} />

        {Array.from({ length: ROWS }).map((_, i) => {
          const y = HEADER_HEIGHT + i * ROW_HEIGHT
          return (
            <Fragment key={i}>
              <circle cx={24} cy={y + 22} r={12} />
              <rect x={44} y={y + 17} rx={4} ry={4} width={100} height={10} />
              {Array.from({ length: MATCH_COLS }).map((__, col) => (
                <rect
                  key={col}
                  x={182 + col * 40}
                  y={y + 12}
                  rx={6}
                  ry={6}
                  width={28}
                  height={20}
                />
              ))}
              <rect x={412} y={y + 15} rx={3} ry={3} width={22} height={14} />
              <rect x={464} y={y + 15} rx={3} ry={3} width={28} height={14} />
            </Fragment>
          )
        })}
      </Skeleton>
    </div>
  )
}
