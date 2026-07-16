import { Navigate, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useSessionStore } from '@/stores/useSessionStore'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Authenticated shell. Every route inside it is guaranteed a session.
 *
 * The `loading` gate is load-bearing: Supabase rehydrates the persisted session
 * asynchronously, so redirecting on `!session` alone would bounce a signed-in
 * user to /auth on every hard refresh.
 */
export function AppShell() {
  const session = useSessionStore((s) => s.session)
  const loading = useSessionStore((s) => s.loading)

  if (loading) {
    return (
      <div className="flex h-svh">
        <Skeleton className="h-full w-56 rounded-none" />
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/auth" replace />

  return (
    <div className="flex h-svh overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
