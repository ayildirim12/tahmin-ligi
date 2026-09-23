import { useState } from 'react'
import { cn } from '@/lib/cn'

/** Member/user profile photo with an initials-circle fallback — mirrors
 *  TeamCrest.tsx's onError pattern, since a bare `<img>` has no fallback at
 *  all if `photoURL` is missing or the URL 404s. */
export function MemberAvatar({
  photoURL,
  displayName,
  size = 24,
  className,
}: {
  photoURL: string | null
  displayName: string | null
  size?: number
  className?: string
}) {
  const [errored, setErrored] = useState(false)
  const style = { width: size, height: size }

  if (!photoURL || errored) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-surface-muted font-semibold leading-none text-muted-foreground',
          className,
        )}
        style={{ ...style, fontSize: Math.max(9, size * 0.4) }}
      >
        {displayName?.trim()?.slice(0, 1)?.toUpperCase() ?? '?'}
      </div>
    )
  }

  return (
    <img
      src={photoURL}
      alt=""
      referrerPolicy="no-referrer"
      className={cn('shrink-0 rounded-full object-cover', className)}
      style={style}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  )
}
