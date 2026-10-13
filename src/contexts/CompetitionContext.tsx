import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CompetitionId } from '@/shared/types'

const STORAGE_KEY = 'tahmin-ligi:competition'

interface CompetitionContextValue {
  competition: CompetitionId
  setCompetition: (next: CompetitionId) => void
}

const CompetitionContext = createContext<CompetitionContextValue | null>(null)

function readStored(): CompetitionId {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ucl' ? 'ucl' : 'superlig'
  } catch {
    return 'superlig'
  }
}

/** Which competition (Süper Lig / Şampiyonlar Ligi) every tab of the community is showing. */
export function CompetitionProvider({ children }: { children: ReactNode }) {
  const [competition, setCompetitionState] = useState<CompetitionId>(readStored)

  const setCompetition = useCallback((next: CompetitionId) => {
    setCompetitionState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage unavailable — the choice just won't persist across visits
    }
  }, [])

  const value = useMemo(() => ({ competition, setCompetition }), [competition, setCompetition])
  return <CompetitionContext.Provider value={value}>{children}</CompetitionContext.Provider>
}

export function useCompetition(): CompetitionContextValue {
  const ctx = useContext(CompetitionContext)
  if (!ctx) throw new Error('useCompetition must be used inside <CompetitionProvider>')
  return ctx
}
