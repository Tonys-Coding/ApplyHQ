import { ChevronDown, ChevronUp, EyeOff, Loader2, Plus } from 'lucide-react'
import { useResumeStore } from '@/stores/useResumeStore'
import { ResumeUpload } from '@/components/ResumeUpload'
import { Editable } from './Editable'
// Side-effect import: bundles the metric-compatible resume fonts so the canvas
// renders the uploaded resume's font, never the app UI font.
import '@/features/resume/lib/fonts'
import { cn } from '@/lib/utils'
import type {
  Bullet,
  EducationEntry,
  ResumeNode,
  ResumeSectionKey,
  TechnicalEntry,
  WorkEntry,
} from '@/types/domain'

/**
 * The live, fully-editable resume page.
 *
 * Rendered at true US-Letter size (8.5x11in) so "Fit to One Page" can measure
 * honestly, in the PDF's own font (format.font_family) rather than the app's
 * sans body font, and split into the resume's real sections — Experience and
 * Projects are separated by each technical entry's `kind` so projects stop
 * bleeding into experience.
 *
 * Every field is an <Editable>: header, titles, dates, GPA, coursework, tech,
 * bullets, skills. Hidden nodes dim rather than unmount, so a toggle back
 * doesn't reflow the page under you.
 */

const splitList = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

function HideButton({ hidden, onToggle, label }: { hidden: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
      className="no-print opacity-0 transition-opacity group-hover/node:opacity-100 group-hover/bullet:opacity-100"
    >
      <EyeOff className="size-3 text-neutral-400 hover:text-neutral-700" />
    </button>
  )
}

/** Per-entry controls: move up/down within the section, and hide. */
function EntryControls({ section, node }: { section: ResumeSectionKey; node: ResumeNode }) {
  const reorderEntry = useResumeStore((s) => s.reorderEntry)
  const toggleNode = useResumeStore((s) => s.toggleNode)
  return (
    <span className="no-print flex items-center gap-0.5 opacity-0 transition-opacity group-hover/node:opacity-100">
      <button
        type="button"
        onClick={() => reorderEntry(section, node.id, 'up')}
        aria-label="Move up"
        className="text-neutral-400 hover:text-neutral-700"
      >
        <ChevronUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => reorderEntry(section, node.id, 'down')}
        aria-label="Move down"
        className="text-neutral-400 hover:text-neutral-700"
      >
        <ChevronDown className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => toggleNode(section, node.id)}
        aria-label={node.hidden ? 'Show entry' : 'Hide entry'}
        className="text-neutral-400 hover:text-neutral-700"
      >
        <EyeOff className="size-3" />
      </button>
    </span>
  )
}

function BulletRow({
  bullet,
  onEdit,
  onToggle,
}: {
  bullet: Bullet
  onEdit: (text: string) => void
  onToggle: () => void
}) {
  return (
    <li className={cn('group/bullet relative flex gap-2 transition-opacity', bullet.hidden && 'opacity-25')}>
      <span aria-hidden className="select-none">
        •
      </span>
      <Editable value={bullet.text} onCommit={onEdit} className="flex-1" placeholder="Bullet…" />
      <span className="absolute -left-6">
        <HideButton hidden={bullet.hidden} onToggle={onToggle} label="bullet" />
      </span>
    </li>
  )
}

function DateRange({
  section,
  id,
  start,
  end,
}: {
  section: ResumeSectionKey
  id: string
  start: string | null
  end: string | null
}) {
  const updateEntry = useResumeStore((s) => s.updateEntry)
  return (
    <span className="ml-auto shrink-0 pl-2 text-[0.85em] tabular-nums">
      <Editable
        value={start ?? ''}
        placeholder="Start"
        onCommit={(v) => updateEntry(section, id, { start_date: v || null })}
      />
      <span className="px-1">–</span>
      <Editable
        value={end ?? ''}
        placeholder="End"
        onCommit={(v) => updateEntry(section, id, { end_date: v || null })}
      />
    </span>
  )
}

function EntryBullets({ section, node }: { section: ResumeSectionKey; node: ResumeNode }) {
  const toggleBullet = useResumeStore((s) => s.toggleBullet)
  const editBullet = useResumeStore((s) => s.editBullet)
  const addBullet = useResumeStore((s) => s.addBullet)

  return (
    <>
      {node.bullets.length > 0 && (
        <ul className="mt-0.5 ml-1 space-y-0.5">
          {node.bullets.map((b) => (
            <BulletRow
              key={b.id}
              bullet={b}
              onEdit={(text) => editBullet(section, node.id, b.id, text)}
              onToggle={() => toggleBullet(section, node.id, b.id)}
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => addBullet(section, node.id)}
        className="no-print mt-0.5 ml-1 flex items-center gap-1 text-[0.75em] text-neutral-400 opacity-0 transition-opacity hover:text-neutral-700 group-hover/node:opacity-100"
      >
        <Plus className="size-3" /> add bullet
      </button>
    </>
  )
}

function EducationBlock({ node }: { node: EducationEntry }) {
  const section: ResumeSectionKey = 'education'
  const updateEntry = useResumeStore((s) => s.updateEntry)
  const u = (patch: Record<string, unknown>) => updateEntry(section, node.id, patch)

  return (
    <div className={cn('group/node mb-2 transition-opacity', node.hidden && 'opacity-25')}>
      <div className="flex items-baseline gap-2">
        <Editable value={node.institution} onCommit={(v) => u({ institution: v })} className="font-semibold" placeholder="Institution" />
        {node.location && (
          <Editable value={node.location} onCommit={(v) => u({ location: v || null })} className="text-[0.85em]" />
        )}
        <DateRange section={section} id={node.id} start={node.start_date} end={node.end_date} />
        <EntryControls section={section} node={node} />
      </div>
      <div className="text-[0.9em] italic">
        <Editable value={node.degree} onCommit={(v) => u({ degree: v })} placeholder="Degree" />
        {(node.field_of_study || node.degree) && <span>, </span>}
        <Editable
          value={node.field_of_study ?? ''}
          onCommit={(v) => u({ field_of_study: v || null })}
          placeholder="Field of study"
        />
      </div>
      <div className="text-[0.9em]">
        GPA:{' '}
        <Editable value={node.gpa ?? ''} onCommit={(v) => u({ gpa: v || null })} placeholder="—" />
      </div>
      {/* Always rendered so empty lists remain editable/discoverable. */}
      <div className="text-[0.9em]">
        <span className="font-semibold">Coursework: </span>
        <Editable
          value={node.coursework.join(', ')}
          onCommit={(v) => u({ coursework: splitList(v) })}
          placeholder="Course, Course…"
        />
      </div>
      <EntryBullets section={section} node={node} />
    </div>
  )
}

function TechnicalBlock({ node }: { node: TechnicalEntry }) {
  const section: ResumeSectionKey = 'technical_projects_and_experience'
  const updateEntry = useResumeStore((s) => s.updateEntry)
  const u = (patch: Record<string, unknown>) => updateEntry(section, node.id, patch)

  const subtitle = node.organization ?? node.role ?? ''

  return (
    <div className={cn('group/node mb-2 transition-opacity', node.hidden && 'opacity-25')}>
      <div className="flex items-baseline gap-2">
        <Editable value={node.title} onCommit={(v) => u({ title: v })} className="font-semibold" placeholder="Title" />
        <Editable
          value={subtitle}
          onCommit={(v) => u(node.organization !== null ? { organization: v || null } : { role: v || null })}
          className="text-[0.9em] italic"
          placeholder="Organization / role"
        />
        <DateRange section={section} id={node.id} start={node.start_date} end={node.end_date} />
        <EntryControls section={section} node={node} />
      </div>
      <div className="text-[0.85em]">
        <span className="font-semibold">Tech: </span>
        <Editable
          value={node.tech_stack.join(', ')}
          onCommit={(v) => u({ tech_stack: splitList(v) })}
          placeholder="React, C, Postgres…"
        />
      </div>
      <EntryBullets section={section} node={node} />
    </div>
  )
}

function WorkBlock({ node }: { node: WorkEntry }) {
  const section: ResumeSectionKey = 'other_work_history'
  const updateEntry = useResumeStore((s) => s.updateEntry)
  const u = (patch: Record<string, unknown>) => updateEntry(section, node.id, patch)

  return (
    <div className={cn('group/node mb-2 transition-opacity', node.hidden && 'opacity-25')}>
      <div className="flex items-baseline gap-2">
        <Editable value={node.employer} onCommit={(v) => u({ employer: v })} className="font-semibold" placeholder="Employer" />
        <Editable value={node.role} onCommit={(v) => u({ role: v })} className="text-[0.9em] italic" placeholder="Role" />
        {node.location && (
          <Editable value={node.location} onCommit={(v) => u({ location: v || null })} className="text-[0.85em]" />
        )}
        <DateRange section={section} id={node.id} start={node.start_date} end={node.end_date} />
        <EntryControls section={section} node={node} />
      </div>
      <EntryBullets section={section} node={node} />
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 border-b border-black pb-0.5 text-[1.05em] font-bold uppercase tracking-wider">
      {children}
    </h2>
  )
}

function ResumeHeaderBlock() {
  const header = useResumeStore((s) => s.format.header)
  const updateHeader = useResumeStore((s) => s.updateHeader)

  const setLine = (i: number, v: string) => {
    const lines = [...header.contact_lines]
    if (v.trim()) lines[i] = v
    else lines.splice(i, 1)
    updateHeader({ contact_lines: lines })
  }

  return (
    <header className="group/node mb-3 text-center">
      <Editable
        as="div"
        value={header.full_name}
        onCommit={(v) => updateHeader({ full_name: v })}
        placeholder="Your Name"
        className="text-[1.7em] font-bold tracking-tight"
      />
      {(header.headline || header.full_name) && (
        <Editable
          as="div"
          value={header.headline ?? ''}
          onCommit={(v) => updateHeader({ headline: v || null })}
          placeholder="Headline (optional)"
          className="text-[0.95em] italic"
        />
      )}
      <div className="mt-0.5 text-[0.85em]">
        {header.contact_lines.map((line, i) => (
          <div key={i}>
            <Editable value={line} onCommit={(v) => setLine(i, v)} />
          </div>
        ))}
        <button
          type="button"
          onClick={() => updateHeader({ contact_lines: [...header.contact_lines, ''] })}
          className="no-print mx-auto mt-0.5 flex items-center gap-1 text-[0.8em] text-neutral-400 opacity-0 transition-opacity hover:text-neutral-700 group-hover/node:opacity-100"
        >
          <Plus className="size-3" /> add contact line
        </button>
      </div>
    </header>
  )
}

function SkillsBlock() {
  const skills = useResumeStore((s) => s.resume?.skills_and_keywords ?? [])
  const updateSkills = useResumeStore((s) => s.updateSkills)

  const setLine = (i: number, v: string) => {
    const lines = [...skills]
    if (v.trim()) lines[i] = v
    else lines.splice(i, 1)
    updateSkills(lines)
  }

  return (
    <section className="group/node">
      <SectionHeading>Skills</SectionHeading>
      {skills.map((line, i) => (
        <div key={i} className="text-[0.95em]">
          <Editable value={line} onCommit={(v) => setLine(i, v)} placeholder="Category: skill, skill…" />
        </div>
      ))}
      <button
        type="button"
        onClick={() => updateSkills([...skills, ''])}
        className="no-print mt-0.5 flex items-center gap-1 text-[0.75em] text-neutral-400 opacity-0 transition-opacity hover:text-neutral-700 group-hover/node:opacity-100"
      >
        <Plus className="size-3" /> add skill line
      </button>
    </section>
  )
}

export function DocumentCanvas() {
  const resume = useResumeStore((s) => s.resume)
  const format = useResumeStore((s) => s.format)
  const loading = useResumeStore((s) => s.loading)

  /* While a load is in flight, don't flash the upload zone. */
  if (!resume && loading) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!resume) return <ResumeUpload />

  const tech = resume.technical_projects_and_experience
  const experience = tech.filter((n) => n.kind === 'experience')
  const projects = tech.filter((n) => n.kind === 'project')

  return (
    <div className="h-full overflow-auto bg-muted/40 p-8">
      <div
        data-resume-page
        className="resume-print mx-auto bg-white text-black shadow-lg"
        style={{
          width: '8.5in',
          minHeight: '11in',
          padding: `${format.margin}in`,
          fontSize: `${format.font_size}pt`,
          lineHeight: format.line_height,
          // The retained font. Never the app's sans body font.
          fontFamily: format.font_family,
        }}
      >
        <ResumeHeaderBlock />

        {resume.education.length > 0 && (
          <section className="mb-3">
            <SectionHeading>Education</SectionHeading>
            {resume.education.map((n) => (
              <EducationBlock key={n.id} node={n} />
            ))}
          </section>
        )}

        {experience.length > 0 && (
          <section className="mb-3">
            <SectionHeading>Experience</SectionHeading>
            {experience.map((n) => (
              <TechnicalBlock key={n.id} node={n} />
            ))}
          </section>
        )}

        {projects.length > 0 && (
          <section className="mb-3">
            <SectionHeading>Projects</SectionHeading>
            {projects.map((n) => (
              <TechnicalBlock key={n.id} node={n} />
            ))}
          </section>
        )}

        {resume.other_work_history.length > 0 && (
          <section className="mb-3">
            <SectionHeading>Work History</SectionHeading>
            {resume.other_work_history.map((n) => (
              <WorkBlock key={n.id} node={n} />
            ))}
          </section>
        )}

        <SkillsBlock />
      </div>
    </div>
  )
}
