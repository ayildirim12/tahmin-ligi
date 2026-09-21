import { useMemo, useState } from 'react'
import { SortableHeaderCell } from './SortableHeaderCell'
import { cn } from '@/lib/cn'
import type { CommunityMember } from '@/shared/types'

type SortKey = 'totalPoints' | 'winsCount' | 'totalPredictions'

export function LeaderboardSeasonTable({ members }: { members: CommunityMember[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('totalPoints')

  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      if (b[sortKey] !== a[sortKey]) return b[sortKey] - a[sortKey]
      // Tie-break: total points, then wins (tendency-or-better count) — per
      // the "rankings of players tied in total points decided by wins" rule.
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      return b.winsCount - a.winsCount
    })
  }, [members, sortKey])

  function toggle(key: SortKey) {
    setSortKey(key)
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-xs">
            <th className="w-10 py-2.5 pl-3 text-left font-medium text-muted-foreground">#</th>
            <th className="sticky left-0 bg-surface py-2.5 text-left font-medium text-muted-foreground">
              Üye
            </th>
            <SortableHeaderCell
              label="T"
              active={sortKey === 'totalPredictions'}
              direction="desc"
              onClick={() => toggle('totalPredictions')}
              className="w-12"
            />
            <SortableHeaderCell
              label="W"
              active={sortKey === 'winsCount'}
              direction="desc"
              onClick={() => toggle('winsCount')}
              className="w-12"
            />
            <SortableHeaderCell
              label="P"
              active={sortKey === 'totalPoints'}
              direction="desc"
              onClick={() => toggle('totalPoints')}
              className="w-14 pr-3"
            />
          </tr>
        </thead>
        <tbody>
          {sorted.map((member, i) => (
            <tr
              key={member.uid}
              className={cn(
                'border-b border-border/60 last:border-0',
                i === 0 && 'bg-warning/10',
              )}
            >
              <td className="py-2.5 pl-3 font-medium">{i + 1}</td>
              <td className="sticky left-0 bg-surface py-2.5">
                <div className="flex items-center gap-2">
                  {member.photoURL && (
                    <img
                      src={member.photoURL}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="size-6 rounded-full"
                    />
                  )}
                  <span className="max-w-[140px] truncate font-medium sm:max-w-none">
                    {member.displayName}
                  </span>
                </div>
              </td>
              <td className="text-center text-muted-foreground">{member.totalPredictions}</td>
              <td className="text-center text-muted-foreground">{member.winsCount}</td>
              <td className="pr-3 text-center text-base font-bold">{member.totalPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
