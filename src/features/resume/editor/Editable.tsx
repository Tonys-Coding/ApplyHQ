import { useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Inline-editable text.
 *
 * Uncontrolled contentEditable that commits on blur — deliberately NOT
 * re-rendered from state on every keystroke, which would fight the caret and
 * bounce it to the end. External changes (AI edits) still flow in because the
 * element isn't focused then, so React is free to update its text.
 *
 * The placeholder shows only while the field is empty, via the CSS below.
 */
export function Editable({
  value,
  onCommit,
  placeholder,
  className,
  as = 'span',
}: {
  value: string
  onCommit: (next: string) => void
  placeholder?: string
  className?: string
  as?: 'span' | 'div'
}) {
  const ref = useRef<HTMLElement>(null)
  const Tag = as as 'span'

  return (
    <Tag
      ref={ref as React.RefObject<HTMLSpanElement>}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onBlur={(e) => {
        const next = e.currentTarget.textContent ?? ''
        if (next !== value) onCommit(next)
      }}
      onKeyDown={(e) => {
        // Enter commits and blurs for single-line fields; Shift+Enter is free.
        if (e.key === 'Enter' && !e.shiftKey && as === 'span') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
      className={cn(
        'rounded-sm outline-none transition-colors focus:bg-primary/10',
        'hover:bg-foreground/5 empty:before:text-black/30 empty:before:content-[attr(data-placeholder)]',
        className,
      )}
    >
      {value}
    </Tag>
  )
}
