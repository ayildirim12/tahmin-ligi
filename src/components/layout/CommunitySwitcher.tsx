import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, Plus, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useCommunities } from '@/hooks/useCommunities'

export function CommunitySwitcher({ activeCommunityId }: { activeCommunityId: string }) {
  const { communities, loading } = useCommunities()
  const navigate = useNavigate()
  const active = communities.find((c) => c.id === activeCommunityId)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex max-w-[45vw] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold text-foreground hover:bg-surface-muted sm:max-w-xs"
        >
          <Users className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{active?.name ?? (loading ? '…' : 'Topluluk seç')}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {communities.map((c) => (
            <DropdownMenu.Item
              key={c.id}
              onSelect={() => navigate(`/c/${c.id}/puan-durumu`)}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-surface-muted"
            >
              <span className="truncate">{c.name}</span>
              {c.id === activeCommunityId && <Check className="size-4 shrink-0 text-primary" />}
            </DropdownMenu.Item>
          ))}
          {communities.length > 0 && <DropdownMenu.Separator className="my-1 h-px bg-border" />}
          <DropdownMenu.Item asChild>
            <Link
              to="/hub"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground outline-none hover:bg-surface-muted"
            >
              <Plus className="size-4" />
              Yeni topluluk / tüm topluluklarım
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
