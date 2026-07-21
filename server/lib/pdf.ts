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
  /**
   * The PDF's dominant font NAME as best recovered — e.g. "Calibri", "Times",
   * "ArialMT", or a generic like "sans-serif". The client resolves this to a
   * metric-compatible web-font stack so the editor matches the original.
   */
  fontName: string
}

/**
 * Embedded PDF fonts are usually subsetted and tagged with a six-letter prefix
 * like "BCDEEE+Calibri". Strip it to recover the real family name, and drop the
 * common style suffixes so "ArialMT" -> "Arial", "Calibri-Bold" -> "Calibri".
 */
function cleanFontName(raw: string): string {
  let n = raw.replace(/^[A-Z]{6}\+/, '').trim()
  n = n.replace(/[-,_](Regular|Bold|Italic|Oblique|Medium|Light|Book|Roman|MT|PS|PSMT)\b/gi, '')
  n = n.replace(/(MT|PSMT)$/i, '')
  return n.trim() || raw
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

  // Character-weighted tally, so the *body* font wins over a few big heading
  // glyphs. Keyed by "realName|generic" recovered from the loaded font object.
  const fontWeight = new Map<string, number>()

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    // Loads the embedded fonts into commonObjs so we can read their real names.
    // No canvas needed — this only builds the operator list.
    await page.getOperatorList().catch(() => {})
    const content = await page.getTextContent()

    const nameFor = (fontId: string): string => {
      try {
        const fo = page.commonObjs.get(fontId) as { name?: string; fallbackName?: string } | null
        const real = fo?.name ? cleanFontName(fo.name) : ''
        const generic = fo?.fallbackName || 'serif'
        return `${real}|${generic}`
      } catch {
        return '|serif'
      }
    }

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

      const fontId = (item as { fontName?: string }).fontName
      const weight = item.str.trim().length
      if (fontId && weight) {
        const k = nameFor(fontId)
        fontWeight.set(k, (fontWeight.get(k) ?? 0) + weight)
      }

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

  const dominant = [...fontWeight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '|serif'
  const [realName, generic] = dominant.split('|')
  // Prefer the real family name; fall back to the generic (serif/sans/mono).
  const fontName = realName || generic || 'serif'

  const text = lines.join('\n')
  return {
    pages: pdf.numPages,
    lines,
    text,
    chars: text.length,
    fontName,
  }
}
