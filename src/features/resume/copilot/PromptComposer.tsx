import { useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useResumeStore } from '@/stores/useResumeStore'
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
  const strictness = useResumeStore((s) => s.strictness)
  const setStrictness = useResumeStore((s) => s.setStrictness)

  return (
    <div className="border-t p-2">
      <div className="rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Make changes..."
          rows={2}
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
            disabled={!prompt.trim()}
            // Wired to POST /api/resume/tailor once the prompt schemas land.
            onClick={() => setPrompt('')}
          >
            <ArrowUp className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
