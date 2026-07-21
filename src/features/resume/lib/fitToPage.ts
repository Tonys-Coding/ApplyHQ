import type { FormatSettings } from '@/types/domain'

const PAGE_PX = 11 * 96 // one US-Letter page height in CSS px (96dpi)

export interface FitResult {
  font_size: number
  line_height: number
  margin: number
  fits: boolean
}

/**
 * Find the largest formatting that makes the resume fit one page.
 *
 * The honest way to know whether content fits is to lay it out and measure, so
 * we mutate the live node's styles and read offsetHeight (a synchronous layout),
 * binary-searching font size. The page's min-height is temporarily dropped to 0
 * so we measure the CONTENT height, not the 11in floor. Font size is the primary
 * lever; if even the minimum overflows, we also tighten line height and margins.
 *
 * Returns the winning settings for the caller to commit to the store — this
 * function does not touch React state, only measures.
 */
export function computeFitToOnePage(node: HTMLElement, current: FormatSettings): FitResult {
  const savedMinHeight = node.style.minHeight
  const savedFont = node.style.fontSize
  const savedLine = node.style.lineHeight
  const savedPad = node.style.padding

  // Measure content height, not the enforced page height.
  node.style.minHeight = '0px'

  const measure = (font: number, line: number, margin: number): number => {
    node.style.fontSize = `${font}pt`
    node.style.lineHeight = String(line)
    node.style.padding = `${margin}in`
    return node.offsetHeight
  }

  const MIN_FONT = 8
  const MAX_FONT = Math.max(current.font_size, MIN_FONT)

  // Pass 1: largest font in [MIN_FONT, current] that fits at current spacing.
  let lo = MIN_FONT
  let hi = MAX_FONT
  let bestFont = MIN_FONT
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2
    if (measure(mid, current.line_height, current.margin) <= PAGE_PX) {
      bestFont = mid
      lo = mid
    } else {
      hi = mid
    }
  }

  let result: FitResult = {
    font_size: round(bestFont),
    line_height: current.line_height,
    margin: current.margin,
    fits: measure(bestFont, current.line_height, current.margin) <= PAGE_PX,
  }

  // Pass 2: still overflowing at the smallest font? Tighten leading + margins.
  if (!result.fits) {
    const tightLine = 1.05
    const tightMargin = 0.4
    result = {
      font_size: MIN_FONT,
      line_height: tightLine,
      margin: tightMargin,
      fits: measure(MIN_FONT, tightLine, tightMargin) <= PAGE_PX,
    }
  }

  // Restore — the store re-render is the source of truth for what renders.
  node.style.minHeight = savedMinHeight
  node.style.fontSize = savedFont
  node.style.lineHeight = savedLine
  node.style.padding = savedPad

  return result
}

function round(n: number): number {
  return Math.round(n * 4) / 4 // nearest 0.25pt, matching the slider step
}
