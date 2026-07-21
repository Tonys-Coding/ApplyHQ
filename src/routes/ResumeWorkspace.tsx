import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useResumeStore } from '@/stores/useResumeStore'
import { requestTailor } from '@/features/resume/lib/aiClient'
import type { WorkspaceInitState } from '@/features/resume/lib/workspaceInit'
import { FormatToolbar } from '@/features/resume/editor/FormatToolbar'
import { DocumentCanvas } from '@/features/resume/editor/DocumentCanvas'
import { CopilotSidebar } from '@/features/resume/copilot/CopilotSidebar'

/*
 * Split-screen editor for one resume (/workspace/:id), reached from the hub.
 * When the creation wizard hands over router state with autoTailor, one
 * tailoring pass runs on arrival; the state is then cleared via replace-
 * navigation so a refresh never re-runs (and re-bills) the model.
 */
export function ResumeWorkspace() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const init = (location.state ?? null) as WorkspaceInitState | null

  const resume = useResumeStore((s) => s.resume)
  const loadResume = useResumeStore((s) => s.loadResume)
  const loadMaster = useResumeStore((s) => s.loadMaster)
  const setTargetApplication = useResumeStore((s) => s.setTargetApplication)

  const initFired = useRef(false)

  useEffect(() => {
    if (id) void loadResume(id)
    else void loadMaster()
  }, [id, loadResume, loadMaster])

  useEffect(() => {
    if (!init || initFired.current || !resume || (id && resume.id !== id)) return
    initFired.current = true

    if (init.jobContext) {
      setTargetApplication(init.applicationId ?? null, init.jobContext)
    }

    if (init.autoTailor && init.jobContext) {
      const run = async () => {
        const state = useResumeStore.getState()
        const sections = state.sections()
        if (!sections) return
        const toastId = toast.loading('Tailoring this resume to the job…')
        try {
          const { plan } = await requestTailor({
            jobTitle: init.jobTitle ?? 'Target role',
            company: init.company ?? 'the company',
            jobDescription: init.jobContext!,
            resume: sections,
            strictness: state.strictness,
          })
          const result = state.applyPlan(plan)
          const applied = result?.applied.length ?? 0
          toast.success(
            applied
              ? `Tailored — ${applied} change${applied === 1 ? '' : 's'} applied`
              : 'No changes were needed',
            { id: toastId, description: plan.summary },
          )
        } catch {
          toast.error('Tailoring failed — you can retry from the copilot.', { id: toastId })
        }
      }
      void run()
    }

    navigate(location.pathname, { replace: true })
  }, [init, resume, id, setTargetApplication, navigate, location.pathname])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FormatToolbar />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <DocumentCanvas />
        </div>
        <CopilotSidebar />
      </div>
    </div>
  )
}
