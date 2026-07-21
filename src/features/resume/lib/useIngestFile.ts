import { useState } from 'react'
import { toast } from 'sonner'
import { ingestResume, type IngestStage } from '@/features/resume/lib/ingest'
import { useResumeStore } from '@/stores/useResumeStore'
import { ApiError } from '@/lib/api'

const MAX_BYTES = 10 * 1024 * 1024

/**
 * Shared PDF-ingest behavior: validate, run the pipeline with per-stage
 * progress, refresh the store, toast. Used by both the empty-state dropzone and
 * the "New base resume" action so the flow lives in exactly one place.
 */
export function useIngestFile() {
  const loadMaster = useResumeStore((s) => s.loadMaster)
  const [stage, setStage] = useState<IngestStage | null>(null)
  const busy = stage !== null && stage !== 'done'

  async function ingest(file: File) {
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

    let failedStage: IngestStage | null = null
    try {
      const { parsedName } = await ingestResume(file, (s) => {
        failedStage = s
        setStage(s)
      })
      await loadMaster()
      toast.success('Resume ready', {
        description: parsedName ? `Parsed ${parsedName}'s resume.` : 'Your resume is loaded.',
      })
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error ? err.message : 'Upload failed.'
      const where =
        failedStage === 'extracting'
          ? 'PDF extraction failed'
          : failedStage === 'structuring'
            ? 'AI structuring failed'
            : failedStage === 'saving'
              ? 'Saving failed'
              : 'Upload failed'
      toast.error(where, { description: message })
    } finally {
      setStage(null)
    }
  }

  return { ingest, stage, busy }
}
