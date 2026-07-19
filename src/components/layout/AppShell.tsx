import { Navigate, Outlet } from 'react-router-dom'
import { TopNav } from './TopNav'
import { useSessionStore } from '@/stores/useSessionStore'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Authenticated shell. Top-nav layout per the TalentPulse references: fixed nav
 * across the top, page content below. Every route inside is session-guarded.
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
      <div className="flex h-svh flex-col">
        <Skeleton className="h-16 w-full rounded-none" />
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    )
  }

  if (!session) return <Navigate to="/auth" replace />

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <TopNav />
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}
