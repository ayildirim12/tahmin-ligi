import { Crown, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { IconButton } from '@/components/ui/IconButton'
import { MemberAvatar } from './MemberAvatar'
import type { CommunityMember } from '@/shared/types'

export function MemberList({
  members,
  isOwner,
  onRemove,
}: {
  members: CommunityMember[]
  isOwner: boolean
  onRemove: (uid: string) => void
}) {
  const { user } = useAuth()

  if (members.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Henüz üye yok.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {members.map((member) => (
        <div key={member.uid} className="flex items-center justify-between gap-2 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <MemberAvatar photoURL={member.photoURL} displayName={member.displayName} size={28} />
            <span className="truncate text-sm font-medium">{member.displayName}</span>
            {member.role === 'owner' && <Crown className="size-3.5 shrink-0 text-warning" />}
          </div>
          {isOwner && member.role !== 'owner' && member.uid !== user?.uid && (
            <IconButton
              aria-label={`${member.displayName} kişisini çıkar`}
              onClick={() => onRemove(member.uid)}
              className="size-7"
            >
              <X className="size-3.5" />
            </IconButton>
          )}
        </div>
      ))}
    </div>
  )
}
