import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InviteLinkCard } from './InviteLinkCard'
import { MemberList } from './MemberList'
import { useAuth } from '@/contexts/AuthContext'
import { getMemberCount, deleteCommunity, leaveCommunity, removeMember } from '@/firebase/communityActions'
import { useMembers } from '@/hooks/useMembers'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import type { Community, CommunityMember } from '@/shared/types'

export function CommunitySettingsDialog({
  open,
  onOpenChange,
  community,
  membership,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  community: Community
  membership: CommunityMember
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { members } = useMembers(community.id)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const isOwner = membership.role === 'owner'

  useEffect(() => {
    if (open) getMemberCount(community.id).then(setMemberCount)
  }, [open, community.id, members.length])

  async function handleRemove(uid: string) {
    setBusy(true)
    try {
      await removeMember(community.id, uid)
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave() {
    if (!user) return
    setBusy(true)
    try {
      await leaveCommunity(user, community.id)
      onOpenChange(false)
      navigate('/hub')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!user) return
    setBusy(true)
    try {
      await deleteCommunity(user, community.id, community.inviteCode)
      onOpenChange(false)
      navigate('/hub')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={community.name} description="Topluluk ayarları">
      <div className="flex flex-col gap-5">
        <InviteLinkCard inviteCode={community.inviteCode} />

        <div>
          <p className="mb-2 text-sm font-semibold">Üyeler</p>
          <MemberList members={members} isOwner={isOwner} onRemove={handleRemove} />
        </div>

        {isOwner ? (
          memberCount !== null && memberCount > 1 ? (
            <p className="text-xs text-muted-foreground">
              Bu topluluğu silmeden önce diğer tüm üyelerin ayrılması gerekiyor.
            </p>
          ) : (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
              Topluluğu sil
            </Button>
          )
        ) : (
          <Button variant="destructive" size="sm" onClick={handleLeave} disabled={busy}>
            Topluluktan ayrıl
          </Button>
        )}
      </div>
    </Dialog>
  )
}
