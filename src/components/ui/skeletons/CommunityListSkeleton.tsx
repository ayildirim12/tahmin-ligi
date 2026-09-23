import { Card } from '../Card'
import { Skeleton } from './Skeleton'

/** Placeholder for CommunityHubPage.tsx's community list items — a title
 *  bar (community name) and a shorter subtitle bar (member count). */
export function CommunityListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="flex items-center justify-between gap-3 px-4 py-3.5">
          <Skeleton viewBox="0 0 320 36" style={{ width: '100%', height: 'auto' }}>
            <rect x={0} y={4} rx={4} ry={4} width={160} height={12} />
            <rect x={0} y={22} rx={3} ry={3} width={90} height={10} />
          </Skeleton>
        </Card>
      ))}
    </div>
  )
}
