import { useEffect, useState } from 'react'
import { RefreshCw, Target } from 'lucide-react'
import { FitScorePanel } from '@/components/FitScorePanel'
import { requestFitScore, type FitReport } from '@/features/matrix/lib/fit'
import { useJobStore } from '@/stores/useJobStore'
import { useResumeStore } from '@/stores/useResumeStore'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Ties the Fit Score to a tracked application. Choosing a target here does two
 * jobs: it scores the resume against that job's description, and it sets the
 * copilot's jobContext so "make it match this role" edits have something to aim
 * at. Only applications that actually carry a description are offered.
 */
export function FitScoreSection() {
  const applications = useJobStore((s) => s.applications)
  const fetchApplications = useJobStore((s) => s.fetchApplications)

  const sections = useResumeStore((s) => s.sections)
  const targetId = useResumeStore((s) => s.targetApplicationId)
  const setTarget = useResumeStore((s) => s.setTargetApplication)
  const resumeLoaded = useResumeStore((s) => !!s.resume)

  const [report, setReport] = useState<FitReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (applications.length === 0) void fetchApplications()
  }, [applications.length, fetchApplications])

  const withDescriptions = applications.filter((a) => a.job_description_text?.trim())
  const target = applications.find((a) => a.id === targetId) ?? null

  async function score(jobDescription: string) {
    const current = sections()
    if (!current) return
    setLoading(true)
    setError(null)
    try {
      setReport(await requestFitScore({ jobDescription, resume: current }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not compute fit score.')
    } finally {
      setLoading(false)
    }
  }

  function onPick(id: string) {
    const app = applications.find((a) => a.id === id)
    if (!app?.job_description_text) return
    setTarget(app.id, app.job_description_text)
    void score(app.job_description_text)
  }

  return (
    <div className="border-b">
      <div className="flex items-center gap-2 px-3 py-2">
        <Target className="size-3.5 text-primary" />
        <span className="text-xs font-medium">Fit Score</span>
        {target?.job_description_text && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-6"
            disabled={loading}
            onClick={() => void score(target.job_description_text!)}
            aria-label="Re-score"
          >
            <RefreshCw className="size-3" />
          </Button>
        )}
      </div>

      <div className="px-3 pb-3">
        <Select value={targetId ?? undefined} onValueChange={onPick}>
          <SelectTrigger size="sm" className="mb-3 w-full text-xs" disabled={!resumeLoaded}>
            <SelectValue placeholder="Choose a target job…" />
          </SelectTrigger>
          <SelectContent>
            {withDescriptions.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                No tracked jobs have a description yet. Save one from Discover.
              </div>
            ) : (
              withDescriptions.map((a) => (
                <SelectItem key={a.id} value={a.id} className="text-xs">
                  {a.role_title} — {a.company_name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <FitScorePanel report={report} loading={loading} error={error} />
      </div>
    </div>
  )
}
