import { useState } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useResumeStore } from '@/stores/useResumeStore'
import { requestCopilotEdit } from '@/features/resume/lib/aiClient'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STRICTNESS_LABELS, type Strictness } from '@/types/domain'

const OPTIONS: Strictness[] = ['strict', 'balanced', 'creative']

export function PromptComposer() {
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const strictness = useResumeStore((s) => s.strictness)
  const setStrictness = useResumeStore((s) => s.setStrictness)
  const sections = useResumeStore((s) => s.sections)
  const applyPlan = useResumeStore((s) => s.applyPlan)
  const jobContext = useResumeStore((s) => s.jobContext)
  const resumeLoaded = useResumeStore((s) => !!s.resume)

  async function send() {
    const instruction = prompt.trim()
    const current = sections()
    if (!instruction || !current || busy) return

    setBusy(true)
    try {
      const { plan } = await requestCopilotEdit({
        instruction,
        resume: current,
        strictness,
        jobContext,
      })

      // Apply on the client so the canvas re-renders the touched nodes only.
      const result = applyPlan(plan)
      setPrompt('')

      if (!result || result.applied.length === 0) {
        // A valid, honest outcome — e.g. the model refused to fabricate. Show
        // its reasoning rather than a misleading "done".
        toast.info('No changes applied', { description: plan.summary })
      } else {
        toast.success(
          `${result.applied.length} change${result.applied.length === 1 ? '' : 's'} applied`,
          { description: plan.summary },
        )
      }
      if (result && result.rejected.length > 0) {
        toast.warning(`${result.rejected.length} operation(s) skipped`, {
          description: 'They referenced entries that no longer exist.',
        })
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Copilot request failed.'
      toast.error('Copilot error', { description: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-t p-2">
      <div className="rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter for a newline — chat convention.
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder={
            resumeLoaded
              ? 'Make changes… e.g. "Bring back my SecondBrain project"'
              : 'Load a resume to start editing.'
          }
          rows={2}
          disabled={!resumeLoaded || busy}
          className="resize-none border-0 px-3 py-2 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center gap-2 p-1.5 pt-0">
          <Select value={strictness} onValueChange={(v) => setStrictness(v as Strictness)}>
            <SelectTrigger size="sm" className="h-7 w-auto gap-1 border-0 text-xs shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {OPTIONS.map((o) => (
                <SelectItem key={o} value={o} className="text-xs">
                  {STRICTNESS_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="icon"
            className="ml-auto size-7 rounded-full"
            disabled={!prompt.trim() || busy || !resumeLoaded}
            onClick={() => void send()}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
