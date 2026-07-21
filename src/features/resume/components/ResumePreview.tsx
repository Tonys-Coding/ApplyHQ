import { useLayoutEffect, useRef, useState } from 'react'
import type { Resume } from '@/types/database'
import {
  DEFAULT_FORMAT_SETTINGS,
  SECTION_LABELS,
  type FormatSettings,
  type ResumeNode,
} from '@/types/domain'

/*
 * Read-only miniature of a resume document, prop-driven so the hub can render
 * many at once (the editable DocumentCanvas is bound to the single active
 * resume in the workspace store). Renders at true page width (816px = 8.5in)
 * in the resume's own font, then CSS-scales to fit its container.
 */

const PAGE_W = 816
const PAGE_H = 1056

function useFitScale(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / PAGE_W))
    ro.observe(el)
    setScale(el.clientWidth / PAGE_W)
    return () => ro.disconnect()
  }, [])

  return [ref, scale]
}

function mergedFormat(resume: Resume): FormatSettings {
  return {
    ...DEFAULT_FORMAT_SETTINGS,
    ...resume.format_settings,
    header: { ...DEFAULT_FORMAT_SETTINGS.header, ...resume.format_settings?.header },
  }
}

function EntryLine({ node }: { node: ResumeNode }) {
  const title =
    'institution' in node ? node.institution : 'title' in node ? node.title : node.employer
  const sub =
    'degree' in node
      ? node.degree
      : 'organization' in node
        ? (node.organization ?? node.role ?? '')
        : node.role

  return (
    <div className="mb-1.5">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold">{title}</span>
        {sub && <span className="text-[0.9em] italic">{sub}</span>}
        <span className="ml-auto text-[0.85em]">
          {[node.start_date, node.end_date].filter(Boolean).join(' – ')}
        </span>
      </div>
      <ul className="ml-1">
        {node.bullets
          .filter((b) => !b.hidden)
          .map((b) => (
            <li key={b.id} className="flex gap-2">
              <span>•</span>
              <span className="flex-1">{b.text}</span>
            </li>
          ))}
      </ul>
    </div>
  )
}

function Section({ label, nodes }: { label: string; nodes: ResumeNode[] }) {
  const visible = nodes.filter((n) => !n.hidden)
  if (visible.length === 0) return null
  return (
    <section className="mb-3">
      <h2 className="mb-1 border-b border-black pb-0.5 text-[1.05em] font-bold uppercase tracking-wider">
        {label}
      </h2>
      {visible.map((n) => (
        <EntryLine key={n.id} node={n} />
      ))}
    </section>
  )
}

export function ResumePreview({ resume }: { resume: Resume }) {
  const [ref, scale] = useFitScale()
  const format = mergedFormat(resume)

  const tech = resume.technical_projects_and_experience
  const experience = tech.filter((t) => t.kind === 'experience')
  const projects = tech.filter((t) => t.kind === 'project')
  const skills = resume.skills_and_keywords.filter((s) => s.trim())

  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ aspectRatio: '8.5 / 11' }}>
      {scale > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 select-none bg-white text-black"
          style={{
            width: PAGE_W,
            height: PAGE_H,
            padding: `${format.margin}in`,
            fontSize: `${format.font_size}pt`,
            lineHeight: format.line_height,
            fontFamily: format.font_family,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <header className="mb-3 text-center">
            <div className="text-[1.7em] font-bold tracking-tight">
              {format.header.full_name}
            </div>
            {format.header.headline && (
              <div className="text-[0.95em] italic">{format.header.headline}</div>
            )}
            <div className="text-[0.85em]">
              {format.header.contact_lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </header>

          <Section label={SECTION_LABELS.education} nodes={resume.education} />
          <Section label="Experience" nodes={experience} />
          <Section label="Projects" nodes={projects} />
          <Section label="Work History" nodes={resume.other_work_history} />

          {skills.length > 0 && (
            <section>
              <h2 className="mb-1 border-b border-black pb-0.5 text-[1.05em] font-bold uppercase tracking-wider">
                Skills
              </h2>
              {skills.map((line, i) => (
                <div key={i} className="text-[0.95em]">
                  {line}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
