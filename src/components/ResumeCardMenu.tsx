import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useResumeHubStore } from '@/stores/useResumeHubStore'
import type { Resume } from '@/types/database'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ResumeCardMenu({ resume }: { resume: Resume }) {
  const navigate = useNavigate()
  const duplicateResume = useResumeHubStore((s) => s.duplicateResume)
  const deleteResume = useResumeHubStore((s) => s.deleteResume)
  const restoreResume = useResumeHubStore((s) => s.restoreResume)
  const [busy, setBusy] = useState(false)

  async function onDuplicate() {
    setBusy(true)
    const copy = await duplicateResume(resume.id)
    setBusy(false)
    if (copy) toast.success('Resume duplicated', { description: copy.version_name })
    else
      toast.error('Could not duplicate', {
        description: useResumeHubStore.getState().error ?? undefined,
      })
  }

  async function onDelete() {
    const removed = await deleteResume(resume.id)
    if (!removed) {
      toast.error('Could not delete', {
        description: useResumeHubStore.getState().error ?? undefined,
      })
      return
    }
    toast('Resume deleted', {
      description: removed.version_name,
      action: {
        label: 'Undo',
        onClick: () => {
          void restoreResume(removed).then((ok) => {
            if (!ok) toast.error('Could not restore the resume.')
          })
        },
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          aria-label={`Actions for ${resume.version_name}`}
          onClick={(e) => e.stopPropagation()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <MoreVertical className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => navigate(`/workspace/${resume.id}`)}>
          <Pencil className="size-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate} disabled={busy}>
          <Copy className="size-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-primary focus:text-primary">
          <Trash2 className="size-4 text-primary" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
