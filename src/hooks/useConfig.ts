import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { configDoc } from '@/firebase/firestore'

interface Config {
  season: string
  currentGameweek: number
}

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(configDoc(), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setConfig({ season: data.season, currentGameweek: data.currentGameweek })
      } else {
        setConfig(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { config, loading }
}
