import { useState } from 'react'
import { Download, Loader2, Type } from 'lucide-react'
import { toast } from 'sonner'
import { useResumeStore } from '@/stores/useResumeStore'
import { FONT_STACKS, fontChoiceOf, type FontChoice } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

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

export function FormatToolbar() {
  const format = useResumeStore((s) => s.format)
  const setFormat = useResumeStore((s) => s.setFormat)
  const save = useResumeStore((s) => s.save)
  const resumeLoaded = useResumeStore((s) => !!s.resume)
  const [busy, setBusy] = useState(false)

  /**
   * One action, both jobs: persist to the account (access anytime) AND hand the
   * user a file. The download is the browser's print-to-PDF over the isolated
   * .resume-print page — a true vector PDF in the resume's own font, no extra
   * dependency. The user picks "Save as PDF" (or a printer) in the dialog.
   */
  async function saveAndDownload() {
    setBusy(true)
    await save()
    const err = useResumeStore.getState().error
    setBusy(false)
    if (err) {
      toast.error('Could not save', { description: err })
      return
    }
    toast.success('Saved to your account', { description: 'Opening PDF download…' })
    // Let the toast paint before the print dialog seizes the thread.
    setTimeout(() => window.print(), 150)
  }

  return (
    <div className="no-print flex h-12 shrink-0 items-center gap-4 overflow-x-auto border-b bg-background px-4">
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
        <span className="w-12 text-xs tabular-nums text-muted-foreground">
          {format.font_size.toFixed(2)}pt
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

      {/* Font family — defaults to the detected PDF font; override if wrong. */}
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

      <Separator orientation="vertical" className="h-5" />

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

      <div className="ml-auto">
        <Button size="sm" onClick={saveAndDownload} disabled={busy || !resumeLoaded}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Save &amp; Download
        </Button>
      </div>
    </div>
  )
}
