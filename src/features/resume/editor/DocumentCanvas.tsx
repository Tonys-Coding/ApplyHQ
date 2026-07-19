import { EyeOff } from 'lucide-react'
import { useResumeStore } from '@/stores/useResumeStore'
import { ResumeUpload } from '@/components/ResumeUpload'
import { cn } from '@/lib/utils'
import {
  SECTION_LABELS,
  nodeTitle,
  type Bullet,
  type ResumeNode,
  type ResumeSectionKey,
} from '@/types/domain'

/**
 * The live resume page.
 *
 * Renders US Letter at true dimensions (8.5in x 11in) and lets the browser's
 * own layout engine do the work. That matters for "Fit to One Page": the only
 * honest way to know whether the content fits is to lay it out at real size and
 * measure, not to estimate from character counts.
 *
 * Hidden nodes stay mounted but dimmed rather than unmounting, so toggling
 * something back doesn't reflow the page out from under you.
 */

const SECTIONS: ResumeSectionKey[] = [
  'education',
  'technical_projects_and_experience',
  'other_work_history',
]

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
    <li
      className={cn(
        'group/bullet relative flex gap-2 transition-opacity',
        bullet.hidden && 'opacity-25',
      )}
    >
      <span aria-hidden className="select-none">
        •
      </span>
      <span
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        // Commit on blur, not on every keystroke: re-rendering a contentEditable
        // from state on each input event fights the caret and it jumps to the end.
        onBlur={(e) => onEdit(e.currentTarget.textContent ?? '')}
        className="flex-1 rounded-sm outline-none focus:bg-accent/40"
      >
        {bullet.text}
      </span>
      <button
        type="button"
        onClick={onToggle}
        aria-label={bullet.hidden ? 'Show bullet' : 'Hide bullet'}
        className="absolute -left-6 opacity-0 transition-opacity group-hover/bullet:opacity-100"
      >
        <EyeOff className="size-3 text-muted-foreground hover:text-foreground" />
      </button>
    </li>
  )
}

function NodeBlock({ section, node }: { section: ResumeSectionKey; node: ResumeNode }) {
  const toggleNode = useResumeStore((s) => s.toggleNode)
  const toggleBullet = useResumeStore((s) => s.toggleBullet)
  const editBullet = useResumeStore((s) => s.editBullet)

  const subtitle =
    'degree' in node
      ? [node.degree, node.field_of_study].filter(Boolean).join(', ')
      : 'organization' in node
        ? (node.organization ?? node.role ?? '')
        : node.role

  return (
    <div className={cn('group/node mb-2 transition-opacity', node.hidden && 'opacity-25')}>
      <div className="flex items-baseline gap-2">
        <span className="font-semibold">{nodeTitle(node)}</span>
        {subtitle && <span className="text-[0.9em] italic">{subtitle}</span>}
        <span className="ml-auto text-[0.85em] tabular-nums">
          {[node.start_date, node.end_date].filter(Boolean).join(' – ')}
        </span>
        <button
          type="button"
          onClick={() => toggleNode(section, node.id)}
          aria-label={node.hidden ? 'Show entry' : 'Hide entry'}
          className="opacity-0 transition-opacity group-hover/node:opacity-100"
        >
          <EyeOff className="size-3 text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      {'gpa' in node && node.gpa && <div className="text-[0.9em]">GPA: {node.gpa}</div>}

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
    </div>
  )
}

export function DocumentCanvas() {
  const resume = useResumeStore((s) => s.resume)
  const format = useResumeStore((s) => s.format)

  if (!resume) {
    return <ResumeUpload />
  }

  return (
    <div className="h-full overflow-auto bg-muted/40 p-8">
      <div
        data-resume-page
        className="mx-auto bg-white text-black shadow-lg"
        style={{
          width: '8.5in',
          minHeight: '11in',
          padding: `${format.margin}in`,
          fontSize: `${format.font_size}pt`,
          lineHeight: format.line_height,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        {/* Header */}
        <header className="mb-3 text-center">
          <div className="text-[1.6em] font-bold tracking-tight">{resume.version_name}</div>
        </header>

        {SECTIONS.map((section) => {
          const nodes = resume[section] as ResumeNode[]
          if (!nodes?.length) return null

          return (
            <section key={section} className="mb-3">
              <h2 className="mb-1 border-b border-black pb-0.5 text-[1.05em] font-bold uppercase tracking-wider">
                {SECTION_LABELS[section]}
              </h2>
              {nodes.map((node) => (
                <NodeBlock key={node.id} section={section} node={node} />
              ))}
            </section>
          )
        })}

        {resume.skills_and_keywords.length > 0 && (
          <section>
            <h2 className="mb-1 border-b border-black pb-0.5 text-[1.05em] font-bold uppercase tracking-wider">
              Skills
            </h2>
            <p>{resume.skills_and_keywords.join(' • ')}</p>
          </section>
        )}
      </div>
    </div>
  )
}
