import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Auth } from '@/routes/Auth'
import { Board } from '@/routes/Board'
import { Discover } from '@/routes/Discover'
import { ResumeWorkspace } from '@/routes/ResumeWorkspace'

export default function App() {
  return (
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
  )
}
