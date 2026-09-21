import type { User } from 'firebase/auth'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { signInWithGoogle, signOut, subscribeToAuthChanges } from '@/firebase/auth'
import { ensureUserDoc } from '@/firebase/firestore'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        await ensureUserDoc(nextUser)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signIn() {
    await signInWithGoogle()
  }

  async function signOutUser() {
    await signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
