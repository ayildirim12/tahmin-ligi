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
      className={cn('inline-flex items-center rounded-lg px-1 py-1 transition-opacity hover:opacity-80', className)}
    >
      {/* Icon-only on narrow phones (shares header space with the community switcher there);
          the full logo (crest + wordmark, baked into the image) once there's room. */}
      <img
        src="/brand/mark-64.png"
        alt=""
        width={64}
        height={64}
        className="size-6 shrink-0 object-contain sm:hidden"
      />
      <img
        src="/brand/logo-lockup.png"
        alt=""
        width={300}
        height={240}
        className="hidden h-10 w-auto object-contain sm:block"
      />
    </Link>
  )
}
