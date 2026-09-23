import { CompassIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthHeroShell } from '@/components/layout/AuthHeroShell'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <AuthHeroShell
      title="Sayfa bulunamadı"
      description="Aradığın sayfa yok ya da taşınmış olabilir."
      showBrandLink
      icon={
        <div className="flex size-20 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
          <CompassIcon className="size-9" strokeWidth={2} />
        </div>
      }
    >
      <Link to="/" className="w-full">
        <Button size="lg" className="w-full">
          Ana sayfaya dön
        </Button>
      </Link>
    </AuthHeroShell>
  )
}
