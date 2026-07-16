import { useEffect } from 'react'
import { useResumeStore } from '@/stores/useResumeStore'
import { FormatToolbar } from '@/features/resume/editor/FormatToolbar'
import { DocumentCanvas } from '@/features/resume/editor/DocumentCanvas'
import { CopilotSidebar } from '@/features/resume/copilot/CopilotSidebar'
import { TopBar } from '@/components/layout/TopBar'

/**
 * Split-screen workspace.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ TopBar                                       │
 *   ├──────────────────────────────────────────────┤
 *   │ FormatToolbar (font / leading / margin / fit)│
 *   ├───────────────────────────┬──────────────────┤
 *   │ DocumentCanvas            │ CopilotSidebar   │
 *   │ (scrolls)                 │ (fixed width)    │
 *   └───────────────────────────┴──────────────────┘
 *
 * min-w-0 on the canvas column is required, not cosmetic: a flex child defaults
 * to min-width:auto, so the 8.5in page would refuse to shrink and push the
 * sidebar off-screen instead of scrolling.
 */
export function ResumeWorkspace() {
  const loadMaster = useResumeStore((s) => s.loadMaster)
  const resume = useResumeStore((s) => s.resume)

  useEffect(() => {
    void loadMaster()
  }, [loadMaster])

  return (
    <>
      <TopBar title={resume ? `Resume — ${resume.version_name}` : 'Resume'} />
      <FormatToolbar />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <DocumentCanvas />
        </div>
        <CopilotSidebar />
      </div>
    </>
  )
}
