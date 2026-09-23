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
      <img src="/brand/mark-64.png" alt="" width={64} height={64} className="size-6 shrink-0 object-contain" />
      {/* Icon-only on narrow phones (shares header space with the community switcher there);
          full wordmark once there's room. */}
      <span className="hidden sm:inline font-display tracking-wide">Tahmin Ligi</span>
    </Link>
  )
}
