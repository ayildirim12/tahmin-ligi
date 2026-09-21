import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function IconButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:pointer-events-none',
        className,
      )}
      {...props}
    />
  )
}
