import { Moon, ScrollText, Settings, Sun } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { CommunitySwitcher } from './CommunitySwitcher'
import { GameRulesDialog } from './GameRulesDialog'
import { communityTabs, profileTab } from './tabs'
import { useTheme } from '@/contexts/ThemeContext'
import { CommunitySettingsDialog } from '@/components/community/CommunitySettingsDialog'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import type { Community, CommunityMember } from '@/shared/types'

interface NavBarProps {
  communityId: string | null
  community?: Community | null
  membership?: CommunityMember | null
}

export function NavBar({ communityId, community, membership }: NavBarProps) {
  const { theme, toggleTheme } = useTheme()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-1 overflow-hidden">
          {communityId ? (
            <>
              <CommunitySwitcher activeCommunityId={communityId} />
              {community && membership && (
                <IconButton aria-label="Topluluk ayarları" onClick={() => setSettingsOpen(true)}>
                  <Settings className="size-4" />
                </IconButton>
              )}
            </>
          ) : (
            <span className="px-2.5 text-sm font-semibold">Tahmin Ligi</span>
          )}
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {communityId &&
            communityTabs.map((tab) => (
              <NavLink
                key={tab.key}
                to={tab.path(communityId)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                  )
                }
              >
                <tab.icon className="size-4" />
                {tab.label}
              </NavLink>
            ))}
        </nav>

        <div className="flex items-center gap-1">
          <IconButton onClick={() => setRulesOpen(true)} aria-label="Oyun kuralları">
            <ScrollText className="size-[18px]" />
          </IconButton>
          <IconButton onClick={toggleTheme} aria-label="Temayı değiştir">
            {theme === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </IconButton>
          <NavLink
            to={profileTab.path}
            className={({ isActive }) =>
              cn(
                'hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors md:flex',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )
            }
          >
            <profileTab.icon className="size-4" />
            {profileTab.label}
          </NavLink>
        </div>
      </div>

      {community && membership && (
        <CommunitySettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          community={community}
          membership={membership}
        />
      )}
      <GameRulesDialog open={rulesOpen} onOpenChange={setRulesOpen} />
    </header>
  )
}
