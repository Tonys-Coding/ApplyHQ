import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface SessionState {
  session: Session | null
  user: User | null
  /** True until the first onAuthStateChange fires — see initSession(). */
  loading: boolean
  signOut: () => Promise<void>
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },
}))

/**
 * Wires the store to Supabase auth. Call once, at module scope in main.tsx.
 *
 * `loading` starts true and only clears once we've heard back. Without that gate
 * a refresh would render the signed-out view for a frame before the persisted
 * session rehydrates, bouncing an authenticated user to /auth.
 */
export function initSession() {
  supabase.auth.getSession().then(({ data }) => {
    useSessionStore.setState({
      session: data.session,
      user: data.session?.user ?? null,
      loading: false,
    })
  })

  // Also fires on token refresh and on the OAuth redirect back from
  // Google/Microsoft, which is how those sessions land.
  supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.setState({
      session,
      user: session?.user ?? null,
      loading: false,
    })
  })
}
