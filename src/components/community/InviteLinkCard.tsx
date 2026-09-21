import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function InviteLinkCard({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/join/${inviteCode}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API blocked — user can still select/copy the text manually.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Bu linke sahip olan herkes topluluğa katılabilir.
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="h-10 flex-1 truncate rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground"
        />
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </Button>
      </div>
    </div>
  )
}
