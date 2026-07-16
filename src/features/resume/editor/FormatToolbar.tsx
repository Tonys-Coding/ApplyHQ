import { Minimize2, Save, Type } from 'lucide-react'
import { useResumeStore } from '@/stores/useResumeStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const MARGIN_PRESETS = [
  { value: '0.4', label: 'Narrow' },
  { value: '0.5', label: 'Normal' },
  { value: '0.75', label: 'Wide' },
] as const

export function FormatToolbar() {
  const format = useResumeStore((s) => s.format)
  const setFormat = useResumeStore((s) => s.setFormat)
  const save = useResumeStore((s) => s.save)

  return (
    <div className="flex h-12 shrink-0 items-center gap-4 border-b bg-background px-4">
      {/* Font size */}
      <div className="flex items-center gap-2">
        <Type className="size-4 text-muted-foreground" />
        <Slider
          value={[format.font_size]}
          onValueChange={([font_size]) => setFormat({ font_size })}
          min={8}
          max={12}
          step={0.25}
          className="w-28"
          aria-label="Font size"
        />
        <span className="w-12 text-xs tabular-nums text-muted-foreground">
          {format.font_size.toFixed(2)}pt
        </span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Line height */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Leading</span>
        <Slider
          value={[format.line_height]}
          onValueChange={([line_height]) => setFormat({ line_height })}
          min={1}
          max={1.6}
          step={0.05}
          className="w-24"
          aria-label="Line height"
        />
        <span className="w-8 text-xs tabular-nums text-muted-foreground">
          {format.line_height.toFixed(2)}
        </span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      {/* Margins */}
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="sm" disabled>
              <Minimize2 className="size-4" />
              Fit to One Page
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Needs the canvas measurement loop — wired up next step.
          </TooltipContent>
        </Tooltip>

        <Button size="sm" onClick={save}>
          <Save className="size-4" />
          Save
        </Button>
      </div>
    </div>
  )
}
