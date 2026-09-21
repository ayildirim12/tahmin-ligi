import { NavLink } from 'react-router-dom'
import { communityTabs, profileTab } from './tabs'
import { cn } from '@/lib/cn'

export function BottomTabBar({ communityId }: { communityId: string | null }) {
  const tabs = communityId
    ? [...communityTabs.map((t) => ({ key: t.key, label: t.label, icon: t.icon, to: t.path(communityId) })),
       { key: profileTab.key, label: profileTab.label, icon: profileTab.icon, to: profileTab.path }]
    : [{ key: profileTab.key, label: profileTab.label, icon: profileTab.icon, to: profileTab.path }]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Ana gezinme"
    >
      <div className={cn('grid', tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-1')}>
        {tabs.map((tab) => (
          <NavLink
            key={tab.key}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <tab.icon className="size-5" />
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
