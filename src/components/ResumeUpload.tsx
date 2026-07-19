import { useRef, useState } from 'react'
import { FileText, Loader2, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { ingestResume, type IngestStage } from '@/features/resume/lib/ingest'
import { useResumeStore } from '@/stores/useResumeStore'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

const MAX_BYTES = 10 * 1024 * 1024

const STAGE_COPY: Record<IngestStage, string> = {
  extracting: 'Extracting text from your PDF…',
  structuring: 'Structuring with AI — this takes a few seconds…',
  saving: 'Saving your master resume…',
  done: 'Done!',
}

/**
 * Drag-and-drop PDF upload. Runs the full ingest pipeline and, on success,
 * refreshes the resume store so the canvas swaps from empty state to the parsed
 * document without a reload.
 */
export function ResumeUpload() {
  const loadMaster = useResumeStore((s) => s.loadMaster)
  const [dragging, setDragging] = useState(false)
  const [stage, setStage] = useState<IngestStage | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const busy = stage !== null && stage !== 'done'

  async function handleFile(file: File) {
    // Validate before spending a round trip. The server re-checks (magic bytes,
    // size) — this is just fast, friendly feedback.
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('PDF only', { description: 'Please upload a .pdf file.' })
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('File too large', { description: 'Maximum size is 10 MB.' })
      return
    }
    if (file.size === 0) {
      toast.error('Empty file', { description: 'That PDF has no content.' })
      return
    }

    try {
      const { parsedName } = await ingestResume(file, setStage)
      await loadMaster() // swap empty state -> parsed resume
      toast.success('Master resume ready', {
        description: parsedName ? `Parsed ${parsedName}'s resume.` : 'Your resume is loaded.',
      })
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : 'Upload failed.'
      // Which stage failed is the most useful thing to tell the user.
      const where =
        stage === 'extracting'
          ? 'PDF extraction failed'
          : stage === 'structuring'
            ? 'AI structuring failed'
            : stage === 'saving'
              ? 'Saving failed'
              : 'Upload failed'
      toast.error(where, { description: message })
      setStage(null)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (busy) return
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  return (
    <div className="grid h-full place-items-center p-8">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && inputRef.current?.click()}
        className={cn(
          'flex w-full max-w-md cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed p-10 text-center transition-colors',
          dragging
            ? 'border-primary bg-primary/10'
            : 'border-border bg-card hover:border-indigo/60 hover:bg-accent/40',
          busy && 'pointer-events-none opacity-90',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = '' // allow re-selecting the same file
          }}
        />

        {busy ? (
          <>
            <div className="relative grid size-14 place-items-center">
              <Loader2 className="size-14 animate-spin text-primary/30" />
              <FileText className="absolute size-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{stage ? STAGE_COPY[stage] : 'Working…'}</p>
              <StageDots stage={stage} />
            </div>
          </>
        ) : (
          <>
            <div className="grid size-14 place-items-center rounded-full bg-primary/10">
              <UploadCloud className="size-7 text-primary" />
            </div>
            <div>
              <p className="font-heading text-base font-semibold">Upload your resume</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Drop a PDF here, or click to browse. We'll parse it into an editable master
                resume.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">PDF · up to 10 MB</p>
          </>
        )}
      </div>
    </div>
  )
}

const STAGE_ORDER: IngestStage[] = ['extracting', 'structuring', 'saving']

function StageDots({ stage }: { stage: IngestStage | null }) {
  const activeIndex = stage ? STAGE_ORDER.indexOf(stage) : -1
  return (
    <div className="mt-3 flex items-center justify-center gap-2">
      {STAGE_ORDER.map((s, i) => (
        <span
          key={s}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i < activeIndex && 'w-6 bg-primary',
            i === activeIndex && 'w-6 bg-primary/60',
            i > activeIndex && 'w-1.5 bg-border',
          )}
        />
      ))}
    </div>
  )
}
