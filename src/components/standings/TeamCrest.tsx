import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { Team } from '@/shared/types'

export function TeamCrest({
  team,
  size = 20,
  className,
}: {
  team: Team | undefined
  size?: number
  className?: string
}) {
  const [errored, setErrored] = useState(false)
  const style = { width: size, height: size }

  if (!team || errored) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-muted font-bold leading-none tracking-tighter text-muted-foreground',
          className,
        )}
        style={{ ...style, fontSize: Math.max(7, size * 0.34) }}
      >
        {team?.shortName?.slice(0, 3).toUpperCase() ?? '?'}
      </div>
    )
  }

  return (
    <img
      // Crests are bundled locally (public/crests/{teamId}.png), not pulled from the
      // live football API — the API's logo URLs turned out to be outdated/stale.
      src={`/crests/${team.id}.png`}
      alt=""
      className={cn('shrink-0 object-contain', className)}
      style={style}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  )
}
