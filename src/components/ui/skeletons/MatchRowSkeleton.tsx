import { Card } from '../Card'
import { Skeleton } from './Skeleton'

/** Card-shaped placeholder matching FixtureCard.tsx / CalendarTab.tsx's match
 *  rows: a status line, two team blocks flanking a center score/input area,
 *  and (for FixtureCard's own "save" button) an optional bottom-right rect. */
export function MatchRowSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <Skeleton viewBox={`0 0 400 ${withAction ? 92 : 68}`} style={{ width: '100%', height: 'auto' }}>
        <rect x={0} y={0} rx={3} ry={3} width={70} height={10} />

        <circle cx={22} cy={40} r={14} />
        <rect x={44} y={35} rx={4} ry={4} width={70} height={10} />

        <rect x={165} y={26} rx={8} ry={8} width={70} height={28} />

        <rect x={286} y={35} rx={4} ry={4} width={70} height={10} />
        <circle cx={378} cy={40} r={14} />

        {withAction && <rect x={296} y={70} rx={8} ry={8} width={104} height={22} />}
      </Skeleton>
    </Card>
  )
}
