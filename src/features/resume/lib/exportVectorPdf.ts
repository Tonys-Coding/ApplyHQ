import { jsPDF } from 'jspdf'
import { pdfBaseFontFor } from './fonts'
import type { Resume } from '@/types/database'
import type {
  EducationEntry,
  FormatSettings,
  TechnicalEntry,
  WorkEntry,
} from '@/types/domain'

/**
 * Render the resume to a REAL vector PDF (selectable text, crisp at any zoom)
 * and download it straight to Downloads.
 *
 * We lay it out with jsPDF's text API using one of the three standard PDF fonts
 * (Times / Helvetica / Courier) — which are metric-compatible with the on-screen
 * Tinos / Arimo / Cousine — so the file closely matches the editor while staying
 * lightweight and searchable. Hidden entries and bullets are omitted, exactly as
 * the canvas shows them.
 */

const PAGE_W = 612 // US Letter, points
const PAGE_H = 792

type Style = 'normal' | 'bold' | 'italic' | 'bolditalic'

export function downloadVectorResumePdf(
  resume: Resume,
  format: FormatSettings,
  filename: string,
): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const family = pdfBaseFontFor(format.font_family)
  const M = format.margin * 72
  const contentW = PAGE_W - 2 * M
  const base = format.font_size
  const lh = format.line_height
  let y = M

  const lineH = (size: number) => size * lh

  function ensure(space: number) {
    if (y + space > PAGE_H - M) {
      doc.addPage()
      y = M
    }
  }

  function setFont(size: number, style: Style) {
    doc.setFont(family, style)
    doc.setFontSize(size)
  }

  /** Wrap + write left-aligned text starting at x; advances y. */
  function paragraph(
    text: string,
    opts: { size?: number; style?: Style; x?: number; width?: number; gapAfter?: number } = {},
  ) {
    if (!text) return
    const size = opts.size ?? base
    const style = opts.style ?? 'normal'
    const x = opts.x ?? M
    const width = opts.width ?? contentW - (x - M)
    setFont(size, style)
    const wrapped = doc.splitTextToSize(text, width) as string[]
    for (const ln of wrapped) {
      ensure(lineH(size))
      doc.text(ln, x, y)
      y += lineH(size)
    }
    if (opts.gapAfter) y += opts.gapAfter
  }

  /** A title on the left with a date range right-aligned on the same baseline. */
  function titleRow(title: string, dates: string, size: number) {
    ensure(lineH(size))
    const datesW = dates ? measure(dates, size, 'normal') + 6 : 0
    setFont(size, 'bold')
    const titleLines = doc.splitTextToSize(title, contentW - datesW) as string[]
    doc.text(titleLines[0] ?? '', M, y)
    if (dates) {
      setFont(size * 0.9, 'normal')
      doc.text(dates, PAGE_W - M, y, { align: 'right' })
    }
    y += lineH(size)
    // Rare long title overflow: continue remaining lines full width.
    for (const ln of titleLines.slice(1)) {
      ensure(lineH(size))
      setFont(size, 'bold')
      doc.text(ln, M, y)
      y += lineH(size)
    }
  }

  function measure(text: string, size: number, style: Style): number {
    setFont(size, style)
    return doc.getTextWidth(text)
  }

  function sectionHeading(label: string) {
    y += base * 0.5
    ensure(lineH(base * 1.05) + 4)
    setFont(base * 1.05, 'bold')
    doc.text(label.toUpperCase(), M, y)
    y += lineH(base * 1.05) * 0.5
    doc.setLineWidth(0.6)
    doc.line(M, y, PAGE_W - M, y)
    y += base * 0.5
  }

  function bullets(items: { text: string; hidden: boolean }[]) {
    for (const b of items) {
      if (b.hidden || !b.text.trim()) continue
      // Hanging indent so wrapped lines align past the bullet glyph.
      setFont(base, 'normal')
      const bulletW = doc.getTextWidth('•  ')
      const wrapped = doc.splitTextToSize(b.text, contentW - bulletW) as string[]
      ensure(lineH(base))
      doc.text('•', M, y)
      for (const ln of wrapped) {
        ensure(lineH(base))
        doc.text(ln, M + bulletW, y)
        y += lineH(base)
      }
    }
  }

  const dateRange = (s: string | null, e: string | null) =>
    [s, e].filter(Boolean).join(' – ')

  // ── Header ────────────────────────────────────────────────────────────────
  const h = format.header
  if (h.full_name) {
    setFont(base * 1.7, 'bold')
    ensure(lineH(base * 1.7))
    doc.text(h.full_name, PAGE_W / 2, y, { align: 'center' })
    y += lineH(base * 1.7)
  }
  if (h.headline) {
    setFont(base * 0.95, 'italic')
    ensure(lineH(base * 0.95))
    doc.text(h.headline, PAGE_W / 2, y, { align: 'center' })
    y += lineH(base * 0.95)
  }
  for (const line of h.contact_lines) {
    if (!line.trim()) continue
    setFont(base * 0.85, 'normal')
    ensure(lineH(base * 0.85))
    doc.text(line, PAGE_W / 2, y, { align: 'center' })
    y += lineH(base * 0.85)
  }

  // ── Education ───────────────────────────────────────────────────────────────
  const edu = resume.education.filter((e) => !e.hidden)
  if (edu.length) {
    sectionHeading('Education')
    for (const e of edu) educationEntry(e)
  }

  // ── Experience & Projects (split by kind) ───────────────────────────────────
  const tech = resume.technical_projects_and_experience.filter((t) => !t.hidden)
  const experience = tech.filter((t) => t.kind === 'experience')
  const projects = tech.filter((t) => t.kind === 'project')
  if (experience.length) {
    sectionHeading('Experience')
    for (const t of experience) technicalEntry(t)
  }
  if (projects.length) {
    sectionHeading('Projects')
    for (const t of projects) technicalEntry(t)
  }

  // ── Work history ────────────────────────────────────────────────────────────
  const work = resume.other_work_history.filter((w) => !w.hidden)
  if (work.length) {
    sectionHeading('Work History')
    for (const w of work) workEntry(w)
  }

  // ── Skills ──────────────────────────────────────────────────────────────────
  const skills = resume.skills_and_keywords.filter((s) => s.trim())
  if (skills.length) {
    sectionHeading('Skills')
    for (const line of skills) paragraph(line, { size: base * 0.95 })
  }

  doc.save(filename)

  function educationEntry(e: EducationEntry) {
    titleRow(e.institution || 'Institution', dateRange(e.start_date, e.end_date), base)
    const sub = [e.degree, e.field_of_study].filter(Boolean).join(', ')
    if (sub) paragraph(sub, { size: base * 0.9, style: 'italic' })
    if (e.gpa) paragraph(`GPA: ${e.gpa}`, { size: base * 0.9 })
    if (e.coursework.length) paragraph(`Coursework: ${e.coursework.join(', ')}`, { size: base * 0.9 })
    bullets(e.bullets)
    y += base * 0.35
  }

  function technicalEntry(t: TechnicalEntry) {
    const sub = t.organization ?? t.role ?? ''
    titleRow(
      sub ? `${t.title}   ${sub}` : t.title || 'Title',
      dateRange(t.start_date, t.end_date),
      base,
    )
    if (t.tech_stack.length) paragraph(`Tech: ${t.tech_stack.join(', ')}`, { size: base * 0.85 })
    bullets(t.bullets)
    y += base * 0.35
  }

  function workEntry(w: WorkEntry) {
    const title = [w.employer, w.role].filter(Boolean).join('   ')
    titleRow(title || 'Employer', dateRange(w.start_date, w.end_date), base)
    bullets(w.bullets)
    y += base * 0.35
  }
}
