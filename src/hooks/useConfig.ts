import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useCompetition } from '@/contexts/CompetitionContext'
import { configDoc } from '@/firebase/firestore'

interface Config {
  season: string
  currentGameweek: number
  /** Display name per gameweek/stage (Champions League only — knockout rounds aren't "N. hafta"). */
  stageLabels: Record<number, string>
}

export function useConfig() {
  const { competition } = useCompetition()
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = onSnapshot(
      configDoc(competition),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          const stageLabels: Record<number, string> = {}
          for (const s of (data.stages ?? []) as Array<{ gameweek: number; label: string }>) {
            stageLabels[s.gameweek] = s.label
          }
          setConfig({ season: data.season, currentGameweek: data.currentGameweek, stageLabels })
        } else {
          setConfig(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error('useConfig: listener failed', error)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [competition])

  return { config, loading }
}

/** "7. hafta" for the league; the stage's own name ("Son 16 · 1. maç") for Champions League. */
export function gameweekLabel(config: Config | null, gameweek: number): string {
  return config?.stageLabels[gameweek] ?? `${gameweek}. hafta`
}
