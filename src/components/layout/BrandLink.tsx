import { Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/** Clickable "Tahmin Ligi" wordmark that always routes home — the app's one
 *  consistent escape hatch, shown wherever a page doesn't already have its
 *  own in-app navigation (the pre-auth login screen, the no-community navbar). */
export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold transition-opacity hover:opacity-80',
        className,
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <Trophy className="size-3.5" strokeWidth={2.5} />
      </span>
      {/* Icon-only on narrow phones (shares header space with the community switcher there);
          full wordmark once there's room. */}
      <span className="hidden sm:inline">Tahmin Ligi</span>
    </Link>
  )
}
