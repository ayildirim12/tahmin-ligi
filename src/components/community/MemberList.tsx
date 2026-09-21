import { Crown, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { IconButton } from '@/components/ui/IconButton'
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

  return (
    <div className="flex flex-col divide-y divide-border">
      {members.map((member) => (
        <div key={member.uid} className="flex items-center justify-between gap-2 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {member.photoURL && (
              <img
                src={member.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="size-7 shrink-0 rounded-full"
              />
            )}
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
