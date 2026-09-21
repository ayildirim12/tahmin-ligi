import { Check, Minus, X } from 'lucide-react'
import { cn } from '@/lib/cn'

const config = {
  W: { icon: Check, className: 'bg-success text-success-foreground' },
  D: { icon: Minus, className: 'bg-tendency text-tendency-foreground' },
  L: { icon: X, className: 'bg-destructive text-destructive-foreground' },
} as const

export function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const { icon: Icon, className } = config[result]
  return (
    <span
      className={cn('flex size-5 items-center justify-center rounded-full', className)}
      aria-label={result === 'W' ? 'Galibiyet' : result === 'D' ? 'Beraberlik' : 'Mağlubiyet'}
    >
      <Icon className="size-3" strokeWidth={3} />
    </span>
  )
}
