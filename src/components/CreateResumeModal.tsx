import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardPaste, FilePlus2, Loader2, Target } from 'lucide-react'
import { toast } from 'sonner'
import { useResumeHubStore } from '@/stores/useResumeHubStore'
import { useJobStore } from '@/stores/useJobStore'
import { ResumeUpload } from '@/components/ResumeUpload'
import type { WorkspaceInitState } from '@/features/resume/lib/workspaceInit'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Step = 'choose' | 'board' | 'external'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateResumeModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const resumes = useResumeHubStore((s) => s.resumes)
  const fetchResumes = useResumeHubStore((s) => s.fetchResumes)
  const duplicateResume = useResumeHubStore((s) => s.duplicateResume)

  const applications = useJobStore((s) => s.applications)
  const fetchApplications = useJobStore((s) => s.fetchApplications)

  const [step, setStep] = useState<Step>('choose')
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>()
  const [pastedJob, setPastedJob] = useState('')
  const [busy, setBusy] = useState(false)

  const master = resumes.find((r) => r.is_master)
  const boardJobs = useMemo(
    () => applications.filter((a) => a.job_description_text?.trim()),
    [applications],
  )

  useEffect(() => {
    if (open && applications.length === 0) void fetchApplications()
    if (!open) {
      setStep('choose')
      setSelectedAppId(undefined)
      setPastedJob('')
      setBusy(false)
    }
  }, [open, applications.length, fetchApplications])

  /* Every path starts by cloning the master; tailor paths then land in the
     workspace with jobContext + autoTailor so the AI pass runs on arrival. */
  async function createFrom(name: string, init?: WorkspaceInitState) {
    if (!master) return
    setBusy(true)
    const copy = await duplicateResume(master.id, name)
    setBusy(false)
    if (!copy) {
      toast.error('Could not create the resume', {
        description: useResumeHubStore.getState().error ?? undefined,
      })
      return
    }
    onOpenChange(false)
    navigate(`/workspace/${copy.id}`, init ? { state: init } : undefined)
  }

  function startBoardTailor() {
    const app = boardJobs.find((a) => a.id === selectedAppId)
    if (!app?.job_description_text) return
    void createFrom(`${app.role_title} — ${app.company_name}`, {
      jobContext: app.job_description_text,
      applicationId: app.id,
      autoTailor: true,
      jobTitle: app.role_title,
      company: app.company_name,
    })
  }

  function startExternalTailor() {
    const text = pastedJob.trim()
    if (!text) return
    void createFrom('Tailored Resume', {
      jobContext: text,
      applicationId: null,
      autoTailor: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Create a new resume</DialogTitle>
          <DialogDescription>
            {master
              ? 'Every new resume starts from your master copy.'
              : 'Upload a base resume first — new versions are built from it.'}
          </DialogDescription>
        </DialogHeader>

        {!master ? (
          <div className="-m-4 mt-0">
            <ResumeUpload onComplete={() => void fetchResumes()} />
          </div>
        ) : step === 'choose' ? (
          <div className="flex flex-col gap-2">
            <OptionCard
              icon={<Target className="size-5" />}
              title="Tailor for a board job"
              description={
                boardJobs.length
                  ? 'Pick a job from your tracker — the AI tailors a copy to its description.'
                  : 'No tracked jobs carry a description yet. Save one from Discover first.'
              }
              disabled={boardJobs.length === 0}
              onClick={() => setStep('board')}
            />
            <OptionCard
              icon={<ClipboardPaste className="size-5" />}
              title="Tailor for an external job"
              description="Paste any job description and get a tailored copy."
              onClick={() => setStep('external')}
            />
            <OptionCard
              icon={<FilePlus2 className="size-5" />}
              title="Start from scratch"
              description="A clean copy of your master resume, no AI changes."
              busy={busy}
              onClick={() => void createFrom('New Resume')}
            />
          </div>
        ) : step === 'board' ? (
          <div className="flex flex-col gap-4">
            <Select value={selectedAppId} onValueChange={setSelectedAppId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a tracked job…" />
              </SelectTrigger>
              <SelectContent>
                {boardJobs.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.role_title} — {a.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <StepFooter
              busy={busy}
              confirmLabel="Create tailored resume"
              confirmDisabled={!selectedAppId}
              onBack={() => setStep('choose')}
              onConfirm={startBoardTailor}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Textarea
              value={pastedJob}
              onChange={(e) => setPastedJob(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={8}
              className="max-h-64"
            />
            <StepFooter
              busy={busy}
              confirmLabel="Create tailored resume"
              confirmDisabled={!pastedJob.trim()}
              onBack={() => setStep('choose')}
              onConfirm={startExternalTailor}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function OptionCard({
  icon,
  title,
  description,
  disabled,
  busy,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  disabled?: boolean
  busy?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-white/5 bg-secondary/40 p-4 text-left transition-colors',
        'hover:border-primary/40 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        {busy ? <Loader2 className="size-5 animate-spin" /> : icon}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}

function StepFooter({
  busy,
  confirmLabel,
  confirmDisabled,
  onBack,
  onConfirm,
}: {
  busy: boolean
  confirmLabel: string
  confirmDisabled: boolean
  onBack: () => void
  onConfirm: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={onBack} disabled={busy}>
        <ArrowLeft className="size-4" />
        Back
      </Button>
      <Button size="sm" onClick={onConfirm} disabled={confirmDisabled || busy}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {confirmLabel}
      </Button>
    </div>
  )
}
