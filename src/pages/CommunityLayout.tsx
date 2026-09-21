import { Navigate, Outlet, useParams } from 'react-router-dom'
import { ActiveCommunityProvider, useActiveCommunity } from '@/contexts/ActiveCommunityContext'
import { AppShell } from '@/components/layout/AppShell'
import { FullScreenSpinner } from '@/components/ui/Spinner'

function CommunityLayoutInner() {
  const { communityId, community, membership, loading } = useActiveCommunity()

  if (loading) return <FullScreenSpinner />

  if (!community || !membership) {
    return <Navigate to="/hub" replace />
  }

  return (
    <AppShell communityId={communityId} community={community} membership={membership}>
      <Outlet />
    </AppShell>
  )
}

export function CommunityLayout() {
  const { communityId } = useParams<{ communityId: string }>()
  if (!communityId) return <Navigate to="/hub" replace />

  return (
    <ActiveCommunityProvider communityId={communityId}>
      <CommunityLayoutInner />
    </ActiveCommunityProvider>
  )
}
