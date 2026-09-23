import { Dialog } from '@/components/ui/Dialog'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold">{title}</p>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

export function GameRulesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Oyun Kuralları">
      <div className="flex flex-col gap-5">
        <Section title="Tahminlerin görünürlüğü">
          Bir maça ait tahminler, o maçın başlama saati geçene kadar başkalarına görünmez. Kendi
          tahminini her zaman görebilir ve düzenleyebilirsin.
        </Section>

        <Section title="Tahmin modu">
          Her maç için <span className="font-medium text-foreground">kesin skor</span> tahmin
          edilir (örn. 2-1).
        </Section>

        <Section title="Tahmin süresi">
          Tahminler maç başlama saatine kadar istediğin kadar güncellenebilir. Maç başladığı anda
          o maça ait tahminin kilitlenir, bir daha değiştirilemez.
        </Section>

        <Section title="Puan eşitliği">
          Toplam puanı eşit olan üyeler, eğilimi (kazanan taraf ya da beraberlik) doğru tahmin
          ettiği maç sayısına (W) göre sıralanır.
        </Section>

        <Section title="Puan tablosu">
          <div className="mt-1 overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-xs">
                  <th className="py-2 pl-3 text-left font-medium"> </th>
                  <th className="py-2 text-center font-medium">Eğilim</th>
                  <th className="py-2 text-center font-medium">Gol Farkı</th>
                  <th className="py-2 pr-3 text-center font-medium">Sonuç</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-2 pl-3 font-medium text-foreground">Galibiyet</td>
                  <td className="text-center tabular-nums">2</td>
                  <td className="text-center tabular-nums">3</td>
                  <td className="py-2 pr-3 text-center font-semibold tabular-nums text-foreground">5</td>
                </tr>
                <tr>
                  <td className="py-2 pl-3 font-medium text-foreground">Beraberlik</td>
                  <td className="text-center tabular-nums">2</td>
                  <td className="text-center">—</td>
                  <td className="py-2 pr-3 text-center font-semibold tabular-nums text-foreground">5</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs">
            Örn. gerçek sonuç 2-1 iken tahmin 1-2 ise 0 puan (yanlış eğilim); tahmin 1-0 ise 3 puan
            (doğru gol farkı); tahmin 2-0 ise 2 puan (sadece doğru eğilim); tahmin 2-1 ise 5 puan
            (tam isabet).
          </p>
        </Section>
      </div>
    </Dialog>
  )
}
