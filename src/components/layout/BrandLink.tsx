import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/** Clickable "Tahmin Ligi" wordmark that always routes home — the app's one
 *  consistent escape hatch, shown wherever a page doesn't already have its
 *  own in-app navigation (the pre-auth login screen, the no-community navbar). */
export function BrandLink({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Tahmin Ligi"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-1 py-1 transition-opacity hover:opacity-80',
        className,
      )}
    >
      <img
        // ?v=2 busts the browser cache for the earlier, wrongly-cropped mark.
        src="/brand/mark-64.png?v=2"
        alt=""
        width={128}
        height={128}
        className="size-10 shrink-0 object-contain"
      />
      {/* The badge carries the wordmark too, but it is unreadable at header
          size — so the name is spelled out beside it, except on narrow phones
          where the header also has to fit the community switcher. */}
      <span className="hidden font-display text-sm tracking-wide sm:inline">Tahmin Ligi</span>
    </Link>
  )
}
