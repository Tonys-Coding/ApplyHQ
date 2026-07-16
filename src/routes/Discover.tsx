import { Compass } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'

/** Placeholder. JSearch integration is the next step. */
export function Discover() {
  return (
    <>
      <TopBar title="Discover" />
      <div className="grid flex-1 place-items-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <Compass className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Job Discovery Hub — JSearch feed lands here next.
          </p>
        </div>
      </div>
    </>
  )
}
