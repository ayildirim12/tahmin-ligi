import ContentLoader from 'react-content-loader'
import type { IContentLoaderProps } from 'react-content-loader'

/**
 * Thin wrapper around react-content-loader with this app's shimmer colors
 * baked in — the two theme tokens resolve fine as SVG presentation-attribute
 * `var(...)` values in every evergreen browser, so no per-theme JS branching
 * is needed here.
 */
export function Skeleton(props: IContentLoaderProps) {
  return (
    <ContentLoader
      backgroundColor="var(--color-surface-muted)"
      foregroundColor="var(--color-border)"
      speed={1.6}
      {...props}
    />
  )
}
