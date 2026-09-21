import { createContext, type ReactNode, useContext, useEffect } from 'react'
import { useCommunity } from '@/hooks/useCommunity'
import { setLastCommunityId } from '@/lib/lastCommunity'
import type { Community, CommunityMember } from '@/shared/types'

interface ActiveCommunityContextValue {
  communityId: string
  community: Community | null
  membership: CommunityMember | null
  loading: boolean
}

const ActiveCommunityContext = createContext<ActiveCommunityContextValue | null>(null)

export function ActiveCommunityProvider({
  communityId,
  children,
}: {
  communityId: string
  children: ReactNode
}) {
  const { community, membership, loading } = useCommunity(communityId)

  useEffect(() => {
    if (community) setLastCommunityId(communityId)
  }, [community, communityId])

  return (
    <ActiveCommunityContext.Provider value={{ communityId, community, membership, loading }}>
      {children}
    </ActiveCommunityContext.Provider>
  )
}

export function useActiveCommunity() {
  const ctx = useContext(ActiveCommunityContext)
  if (!ctx) throw new Error('useActiveCommunity must be used within an ActiveCommunityProvider')
  return ctx
}
