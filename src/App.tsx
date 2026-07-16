import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Auth } from '@/routes/Auth'
import { Board } from '@/routes/Board'
import { Discover } from '@/routes/Discover'
import { ResumeWorkspace } from '@/routes/ResumeWorkspace'

/**
 * Conservative defaults, set by JSearch's 200-requests/month ceiling: React
 * Query would otherwise refetch on every window focus and drain the quota just
 * from alt-tabbing. Per-query overrides live in useJobSearch.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider delayDuration={200}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            {/* Everything below AppShell is session-guarded. */}
            <Route element={<AppShell />}>
              <Route path="/board" element={<Board />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/workspace" element={<ResumeWorkspace />} />
            </Route>
            <Route path="*" element={<Navigate to="/board" replace />} />
          </Routes>
        </TooltipProvider>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
