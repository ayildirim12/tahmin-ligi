import { Outlet, useParams } from 'react-router-dom'
import { ActiveCommunityProvider, useActiveCommunity } from '@/contexts/ActiveCommunityContext'
import { AppShell } from '@/components/layout/AppShell'
import { FullScreenSpinner } from '@/components/ui/Spinner'
import { NotFoundPage } from '@/pages/NotFoundPage'

function CommunityLayoutInner() {
  const { communityId, community, membership, loading } = useActiveCommunity()

  if (loading) return <FullScreenSpinner />

  // Doesn't exist, or exists but you're not (or no longer) a member — either
  // way there's nothing here for you, so say so plainly instead of silently
  // bouncing to /hub (a stale/mistyped link should look like a dead end, not
  // an unexplained redirect).
  if (!community || !membership) {
    return <NotFoundPage />
  }

  return (
    <AppShell communityId={communityId} community={community} membership={membership}>
      <Outlet />
    </AppShell>
  )
}

export function CommunityLayout() {
  const { communityId } = useParams<{ communityId: string }>()
  if (!communityId) return <NotFoundPage />

  return (
    <ActiveCommunityProvider communityId={communityId}>
      <CommunityLayoutInner />
    </ActiveCommunityProvider>
  )
}
