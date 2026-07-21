// Metric-compatible open fonts, bundled so the editor renders the uploaded
// resume's font faithfully on any machine — not the app's UI font.
//   Tinos   ≈ Times New Roman     Gelasio ≈ Georgia
//   Arimo   ≈ Arial / Helvetica   Carlito ≈ Calibri
//   Cousine ≈ Courier New
import '@fontsource/tinos/400.css'
import '@fontsource/tinos/700.css'
import '@fontsource/tinos/400-italic.css'
import '@fontsource/tinos/700-italic.css'
import '@fontsource/arimo/400.css'
import '@fontsource/arimo/700.css'
import '@fontsource/arimo/400-italic.css'
import '@fontsource/arimo/700-italic.css'
import '@fontsource/carlito/400.css'
import '@fontsource/carlito/700.css'
import '@fontsource/carlito/400-italic.css'
import '@fontsource/carlito/700-italic.css'
import '@fontsource/gelasio/400.css'
import '@fontsource/gelasio/700.css'
import '@fontsource/cousine/400.css'
import '@fontsource/cousine/700.css'

export type PdfBaseFont = 'times' | 'helvetica' | 'courier'

interface FontMatch {
  /** Bundled metric-compatible clone. */
  clone: string
  generic: 'serif' | 'sans-serif' | 'monospace'
  /** jsPDF standard font for vector export (metric-compatible, selectable). */
  pdf: PdfBaseFont
}

// Ordered longest/most-specific first so "times new roman" beats "times".
const RULES: [RegExp, FontMatch][] = [
  [/calibri|carlito/i, { clone: 'Carlito', generic: 'sans-serif', pdf: 'helvetica' }],
  [/georgia|gelasio/i, { clone: 'Gelasio', generic: 'serif', pdf: 'times' }],
  [/courier|consol|monaco|mono|cousine/i, { clone: 'Cousine', generic: 'monospace', pdf: 'courier' }],
  [/arial|helvet|liberation sans|arimo|verdana|tahoma|segoe|roboto|open ?sans|lato|noto sans/i,
    { clone: 'Arimo', generic: 'sans-serif', pdf: 'helvetica' }],
  [/times|serif|garamond|minion|cambria|palatino|book antiqua|liberation serif|tinos/i,
    { clone: 'Tinos', generic: 'serif', pdf: 'times' }],
]

function match(name: string): FontMatch {
  for (const [re, m] of RULES) if (re.test(name)) return m
  // Unknown named font: assume serif (resumes skew serif) but keep the real
  // name first in the stack so an installed copy still wins.
  return { clone: 'Tinos', generic: 'serif', pdf: 'times' }
}

/**
 * Resolve a detected PDF font name to a CSS stack. The real name goes first —
 * if the viewer's OS has it (Calibri on Windows, Times on macOS) it's used
 * exactly; otherwise the bundled metric-compatible clone, then the generic.
 */
export function resolveFontStack(name: string): string {
  const clean = (name || '').trim()
  const m = match(clean)
  const isGeneric = /^(serif|sans-serif|monospace|sans)$/i.test(clean)
  const parts = isGeneric ? [m.clone] : [quote(clean), m.clone]
  return `${parts.join(', ')}, ${m.generic}`
}

/** Which jsPDF standard font best matches this CSS stack (for vector export). */
export function pdfBaseFontFor(stack: string): PdfBaseFont {
  if (/cousine|courier|mono/i.test(stack)) return 'courier'
  if (/arimo|carlito|arial|helvet|calibri|sans/i.test(stack)) return 'helvetica'
  return 'times'
}

function quote(name: string): string {
  return /\s/.test(name) ? `"${name}"` : name
}
