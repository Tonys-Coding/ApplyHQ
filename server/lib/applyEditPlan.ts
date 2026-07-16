import type { ResumeEditPlan, ResumeOperation } from '../schemas/resume'
import type {
  Bullet,
  EducationEntry,
  TechnicalEntry,
  WorkEntry,
} from '../../src/types/domain'

/**
 * Applies a model-authored edit plan to a resume.
 *
 * This is the trust boundary. Structured Outputs guarantees the JSON *shape*;
 * it guarantees nothing about whether `entry_id` names a real entry. A model
 * that hallucinates an id would, without this, either throw deep in a render or
 * silently no-op. Every op is resolved against the actual resume first, and
 * anything unresolvable is rejected into `rejected[]` and surfaced — never
 * swallowed.
 *
 * Pure and synchronous: same inputs, same outputs, trivially testable.
 */

export interface ResumeSections {
  education: EducationEntry[]
  technical_projects_and_experience: TechnicalEntry[]
  other_work_history: WorkEntry[]
  skills_and_keywords: string[]
}

export interface AppliedChange {
  op: ResumeOperation['op']
  entry_id: string | null
  bullet_id: string | null
  rationale: string
  before: string | null
  after: string | null
}

export interface ApplyResult {
  resume: ResumeSections
  applied: AppliedChange[]
  /** Ops that referenced something nonexistent or were internally inconsistent. */
  rejected: { op: ResumeOperation; reason: string }[]
}

type AnyEntry = EducationEntry | TechnicalEntry | WorkEntry

export function applyEditPlan(resume: ResumeSections, plan: ResumeEditPlan): ApplyResult {
  // Deep-ish clone so callers can diff against the original.
  const next: ResumeSections = {
    education: resume.education.map(cloneEntry),
    technical_projects_and_experience:
      resume.technical_projects_and_experience.map(cloneEntry),
    other_work_history: resume.other_work_history.map(cloneEntry),
    skills_and_keywords: [...resume.skills_and_keywords],
  }

  const applied: AppliedChange[] = []
  const rejected: ApplyResult['rejected'] = []

  for (const op of plan.operations) {
    if (op.op === 'set_skills') {
      if (!op.skills) {
        rejected.push({ op, reason: 'set_skills without a skills array' })
        continue
      }
      const before = next.skills_and_keywords.join(', ')
      next.skills_and_keywords = op.skills
      applied.push({
        op: op.op,
        entry_id: null,
        bullet_id: null,
        rationale: op.rationale,
        before,
        after: op.skills.join(', '),
      })
      continue
    }

    if (!op.section) {
      rejected.push({ op, reason: 'missing section' })
      continue
    }
    if (!op.entry_id) {
      rejected.push({ op, reason: 'missing entry_id' })
      continue
    }

    const entries = next[op.section] as AnyEntry[]
    const entry = entries.find((e) => e.id === op.entry_id)
    if (!entry) {
      // The model referenced an entry that does not exist — almost always a
      // hallucinated id. Drop it loudly rather than mutating something adjacent.
      rejected.push({ op, reason: `no entry ${op.entry_id} in ${op.section}` })
      continue
    }

    switch (op.op) {
      case 'set_entry_hidden': {
        if (op.hidden === null) {
          rejected.push({ op, reason: 'set_entry_hidden without hidden' })
          break
        }
        const before = String(entry.hidden)
        entry.hidden = op.hidden
        applied.push({
          op: op.op,
          entry_id: entry.id,
          bullet_id: null,
          rationale: op.rationale,
          before,
          after: String(op.hidden),
        })
        break
      }

      case 'set_bullet_hidden':
      case 'rewrite_bullet': {
        if (!op.bullet_id) {
          rejected.push({ op, reason: `${op.op} without bullet_id` })
          break
        }
        const bullet = entry.bullets.find((b) => b.id === op.bullet_id)
        if (!bullet) {
          rejected.push({ op, reason: `no bullet ${op.bullet_id} in entry ${entry.id}` })
          break
        }

        if (op.op === 'set_bullet_hidden') {
          if (op.hidden === null) {
            rejected.push({ op, reason: 'set_bullet_hidden without hidden' })
            break
          }
          const before = String(bullet.hidden)
          bullet.hidden = op.hidden
          applied.push({
            op: op.op,
            entry_id: entry.id,
            bullet_id: bullet.id,
            rationale: op.rationale,
            before,
            after: String(op.hidden),
          })
        } else {
          if (!op.text) {
            rejected.push({ op, reason: 'rewrite_bullet without text' })
            break
          }
          const before = bullet.text
          bullet.text = op.text
          // Marks the bullet as model-authored, which is what lets the UI show
          // "AI" provenance and lets the user reclaim it by editing.
          bullet.origin = 'ai'
          applied.push({
            op: op.op,
            entry_id: entry.id,
            bullet_id: bullet.id,
            rationale: op.rationale,
            before,
            after: op.text,
          })
        }
        break
      }
    }
  }

  return { resume: next, applied, rejected }
}

function cloneEntry<T extends AnyEntry>(entry: T): T {
  return {
    ...entry,
    bullets: entry.bullets.map((b: Bullet) => ({ ...b })),
  }
}
