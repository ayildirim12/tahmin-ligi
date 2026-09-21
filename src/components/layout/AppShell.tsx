import type { ReactNode } from 'react'
import { BottomTabBar } from './BottomTabBar'
import { NavBar } from './NavBar'
import type { Community, CommunityMember } from '@/shared/types'

export function AppShell({
  communityId,
  community,
  membership,
  children,
}: {
  communityId: string | null
  community?: Community | null
  membership?: CommunityMember | null
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <NavBar communityId={communityId} community={community} membership={membership} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4 md:pb-8">{children}</main>
      <BottomTabBar communityId={communityId} />
    </div>
  )
}
