import { useRef, useState } from 'react'
import { Download, FileDown, FileUp, Loader2, Minimize2, MoreHorizontal, RotateCcw, Type } from 'lucide-react'
import { toast } from 'sonner'
import { useResumeStore } from '@/stores/useResumeStore'
import { FONT_STACKS, fontChoiceOf, type FontChoice } from '@/types/domain'
import { downloadVectorResumePdf } from '@/features/resume/lib/exportVectorPdf'
import { downloadOriginalPdf } from '@/features/resume/lib/downloadOriginal'
import { computeFitToOnePage } from '@/features/resume/lib/fitToPage'
import { useIngestFile } from '@/features/resume/lib/useIngestFile'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const MARGIN_PRESETS = [
  { value: '0.4', label: 'Narrow' },
  { value: '0.5', label: 'Normal' },
  { value: '0.75', label: 'Wide' },
] as const

const FONT_PRESETS: { value: FontChoice; label: string }[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Sans' },
  { value: 'mono', label: 'Mono' },
]

const resumeNode = () => document.querySelector<HTMLElement>('[data-resume-page]')

export function FormatToolbar() {
  const format = useResumeStore((s) => s.format)
  const setFormat = useResumeStore((s) => s.setFormat)
  const save = useResumeStore((s) => s.save)
  const revert = useResumeStore((s) => s.revertToOriginal)
  const resumeLoaded = useResumeStore((s) => !!s.resume)
  const hasOriginal = useResumeStore((s) => !!s.format.original)
  const pdfPath = useResumeStore((s) => s.resume?.pdf_storage_path ?? null)

  const { ingest, busy: ingesting } = useIngestFile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [downloading, setDownloading] = useState(false)

  function fitToPage() {
    const node = resumeNode()
    if (!node) return
    const r = computeFitToOnePage(node, format)
    setFormat({ font_size: r.font_size, line_height: r.line_height, margin: r.margin })
    toast[r.fits ? 'success' : 'warning'](
      r.fits ? 'Fit to one page' : 'Tightened as far as it goes',
      {
        description: r.fits
          ? `Font ${r.font_size}pt.`
          : 'Still over one page — hide a few bullets or entries to finish.',
      },
    )
  }

  /** Save to the account AND download a vector PDF straight to Downloads. */
  async function saveAndDownload() {
    const resume = useResumeStore.getState().resume
    if (!resume) return
    setDownloading(true)
    await save()
    if (useResumeStore.getState().error) {
      toast.error('Could not save', { description: useResumeStore.getState().error! })
      setDownloading(false)
      return
    }
    try {
      const name = format.header.full_name?.trim() || 'resume'
      downloadVectorResumePdf(resume, format, `${name} — Resume.pdf`)
      toast.success('Saved & downloaded', {
        description: 'Vector PDF in your Downloads folder.',
      })
    } catch (err) {
      toast.error('Download failed', {
        description: err instanceof Error ? err.message : 'Could not generate the PDF.',
      })
    } finally {
      setDownloading(false)
    }
  }

  async function onDownloadOriginal() {
    if (!pdfPath) return
    try {
      const name = format.header.full_name?.trim() || 'resume'
      await downloadOriginalPdf(pdfPath, `${name} — Original.pdf`)
    } catch (err) {
      toast.error('Could not download original', {
        description: err instanceof Error ? err.message : 'The original file is unavailable.',
      })
    }
  }

  function onRevert() {
    if (revert()) toast.success('Reverted to your original uploaded resume')
    else toast.info('No original snapshot for this resume')
  }

  return (
    <div className="no-print flex h-12 shrink-0 items-center gap-3 overflow-x-auto border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <Type className="size-4 text-muted-foreground" />
        <Slider
          value={[format.font_size]}
          onValueChange={([font_size]) => setFormat({ font_size })}
          min={8}
          max={12}
          step={0.25}
          className="w-24"
          aria-label="Font size"
        />
        <span className="w-11 text-xs tabular-nums text-muted-foreground">
          {format.font_size.toFixed(1)}pt
        </span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Leading</span>
        <Slider
          value={[format.line_height]}
          onValueChange={([line_height]) => setFormat({ line_height })}
          min={1}
          max={1.6}
          step={0.05}
          className="w-20"
          aria-label="Line height"
        />
      </div>

      <Separator orientation="vertical" className="h-5" />

      <ToggleGroup
        type="single"
        size="sm"
        value={fontChoiceOf(format.font_family)}
        onValueChange={(v) => v && setFormat({ font_family: FONT_STACKS[v as FontChoice] })}
        variant="outline"
      >
        {FONT_PRESETS.map((f) => (
          <ToggleGroupItem key={f.value} value={f.value} className="px-2.5 text-xs">
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ToggleGroup
        type="single"
        size="sm"
        value={String(format.margin)}
        onValueChange={(v) => v && setFormat({ margin: Number(v) })}
        variant="outline"
      >
        {MARGIN_PRESETS.map((m) => (
          <ToggleGroupItem key={m.value} value={m.value} className="px-2.5 text-xs">
            {m.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={fitToPage} disabled={!resumeLoaded}>
          <Minimize2 className="size-4" />
          Fit to one page
        </Button>

        <Button size="sm" onClick={saveAndDownload} disabled={downloading || !resumeLoaded}>
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Save &amp; Download
        </Button>

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void ingest(file)
            e.target.value = ''
          }}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="More actions">
              {ingesting ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDownloadOriginal} disabled={!pdfPath}>
              <FileDown className="size-4" />
              Download original PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileRef.current?.click()}>
              <FileUp className="size-4" />
              Upload new base resume
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRevert} disabled={!hasOriginal}>
              <RotateCcw className="size-4" />
              Revert to original
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
