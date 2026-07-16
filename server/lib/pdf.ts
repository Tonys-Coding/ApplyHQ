import { getDocumentProxy } from 'unpdf'

/**
 * PDF text extraction, layout-aware.
 *
 * unpdf's own extractText() joins every glyph run with a space, which flattens
 * the whole document into one line. For prose that is survivable; for a resume
 * it is not — "EDUCATION" and the degree below it collapse into the same
 * sentence, and the model loses every section and bullet boundary it needs.
 *
 * So we go one level down to the pdf.js text items and rebuild lines from glyph
 * geometry: group runs by baseline Y, order them by X, and emit one string per
 * visual line. Verified against a real PDF — reproduces the source line breaks
 * exactly.
 */

export interface ExtractedPdf {
  pages: number
  /** One entry per visual line, in reading order, blank lines dropped. */
  lines: string[]
  /** lines joined with \n — the form handed to the model. */
  text: string
  chars: number
}

/**
 * Baseline tolerance, in PDF units (~1/72"). Glyphs on one visual line rarely
 * share an exact Y — superscripts, differing font sizes, and subpixel kerning
 * all jitter it. Rounding to the nearest 0.5 absorbs that without merging
 * genuinely adjacent lines, which sit >= 1 line-height apart (~10+ units).
 */
const BASELINE_TOLERANCE = 2

interface Run {
  x: number
  str: string
}

export async function extractPdfText(bytes: Uint8Array): Promise<ExtractedPdf> {
  const pdf = await getDocumentProxy(bytes)
  const lines: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    const rows = new Map<number, Run[]>()

    for (const item of content.items) {
      if (!('str' in item) || typeof item.str !== 'string') continue
      // Compare to '' — NOT !item.str.trim(). pdf.js emits inter-word spaces as
      // their own items whose str is " ", so a truthiness/trim guard silently
      // deletes every space and yields "AnthonySalto". Only genuinely empty
      // runs are skippable.
      if (item.str === '') continue

      // transform = [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const x = item.transform[4] as number
      const y = item.transform[5] as number
      const key = Math.round(y * BASELINE_TOLERANCE) / BASELINE_TOLERANCE

      const row = rows.get(key)
      if (row) row.push({ x, str: item.str })
      else rows.set(key, [{ x, str: item.str }])
    }

    const pageLines = [...rows.entries()]
      // Descending Y: PDF origin is bottom-left, so larger Y is higher up.
      .sort((a, b) => b[0] - a[0])
      .map(([, runs]) =>
        runs
          .sort((a, b) => a.x - b.x)
          .map((r) => r.str)
          .join('')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter((line) => line.length > 0)

    lines.push(...pageLines)
  }

  const text = lines.join('\n')
  return { pages: pdf.numPages, lines, text, chars: text.length }
}
