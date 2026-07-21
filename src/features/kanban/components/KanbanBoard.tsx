import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useJobStore, selectColumn } from '@/stores/useJobStore'
import { STAGES, STAGE_LABELS } from '@/features/kanban/lib/stages'
import type { GhostedApplication } from '@/features/kanban/lib/ghosting'
import type { ApplicationStage } from '@/types/domain'
import { ApplicationCard } from './ApplicationCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Board = Record<ApplicationStage, GhostedApplication[]>

const STAGE_DOT: Record<ApplicationStage, string> = {
  submitted: 'bg-indigo',
  pending: 'bg-warning',
  interview_request: 'bg-primary',
  offer: 'bg-coral',
  accepted: 'bg-success',
  rejected: 'bg-muted-foreground',
}

function buildBoard(apps: GhostedApplication[] | ReturnType<typeof selectColumn>, now: number): Board {
  const board = {} as Board
  for (const stage of STAGES) board[stage] = selectColumn(apps as never, stage, now)
  return board
}

export function KanbanBoard() {
  const applications = useJobStore((s) => s.applications)
  const fetchApplications = useJobStore((s) => s.fetchApplications)
  const moveCard = useJobStore((s) => s.moveCard)

  const [board, setBoard] = useState<Board>(() => buildBoard(applications as never, Date.now()))
  const [activeId, setActiveId] = useState<string | null>(null)

  /* boardRef mirrors the latest board so drag handlers read fresh state without
     stale closures — onDragOver re-renders flush before onDragEnd fires. */
  const boardRef = useRef(board)
  boardRef.current = board

  useEffect(() => {
    void fetchApplications()
  }, [fetchApplications])

  /* Re-derive columns from the store, but never mid-drag: onDragOver mutates the
     local board optimistically, and a store resync would fight it. */
  useEffect(() => {
    if (!activeId) setBoard(buildBoard(applications as never, Date.now()))
  }, [applications, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const findContainer = (id: string): ApplicationStage | null => {
    if (id in boardRef.current) return id as ApplicationStage
    return (
      STAGES.find((stage) => boardRef.current[stage].some((c) => c.id === id)) ?? null
    )
  }

  const activeApp = activeId
    ? STAGES.flatMap((s) => board[s]).find((c) => c.id === activeId) ?? null
    : null

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  /* Cross-column: move the dragged card into the column it's hovering, so the
     UI shows it there during the drag. Within-column ordering is left to the
     SortableContext until drop. */
  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeContainer = findContainer(String(active.id))
    const overContainer = findContainer(String(over.id))
    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    setBoard((prev) => {
      const source = prev[activeContainer]
      const dest = prev[overContainer]
      const card = source.find((c) => c.id === active.id)
      if (!card) return prev

      const overIndex = dest.findIndex((c) => c.id === over.id)
      const insertAt = overIndex >= 0 ? overIndex : dest.length

      return {
        ...prev,
        [activeContainer]: source.filter((c) => c.id !== active.id),
        [overContainer]: [
          ...dest.slice(0, insertAt),
          { ...card, stage: overContainer },
          ...dest.slice(insertAt),
        ],
      }
    })
  }

  /* Commit: finalize ordering in the destination column and fire ONE optimistic
     store move (which PATCHes stage + board_position). The store's own update
     then flows back through the resync effect. */
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    const activeId = String(active.id)
    setActiveId(null)
    if (!over) return

    const container = findContainer(String(over.id))
    if (!container) return

    const items = boardRef.current[container]
    const oldIndex = items.findIndex((c) => c.id === activeId)
    const overIndex = items.findIndex((c) => c.id === String(over.id))
    const newIndex = overIndex >= 0 ? overIndex : items.length - 1

    let finalIndex = oldIndex
    if (oldIndex !== newIndex && oldIndex >= 0) {
      const reordered = arrayMove(items, oldIndex, newIndex)
      setBoard((prev) => ({ ...prev, [container]: reordered }))
      finalIndex = reordered.findIndex((c) => c.id === activeId)
    }

    void moveCard(activeId, container, Math.max(0, finalIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => (
          <Column key={stage} stage={stage} apps={board[stage]} />
        ))}
      </div>

      <DragOverlay>
        {activeApp ? <ApplicationCard app={activeApp} dragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function Column({ stage, apps }: { stage: ApplicationStage; apps: GhostedApplication[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { type: 'column' } })

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <span className={cn('size-2 rounded-full', STAGE_DOT[stage])} />
        <span className="text-xs font-semibold">{STAGE_LABELS[stage]}</span>
        <Badge variant="secondary" className="tabular-nums">
          {apps.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-24 flex-1 flex-col gap-2 rounded-lg p-1 transition-colors',
          isOver && 'bg-accent/50',
        )}
      >
        <SortableContext items={apps.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {apps.map((app) => (
            <SortableCard key={app.id} app={app} />
          ))}
        </SortableContext>
        {apps.length === 0 && (
          <div className="grid flex-1 place-items-center rounded-lg border border-dashed text-xs text-muted-foreground">
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

function SortableCard({ app }: { app: GhostedApplication }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
    data: { stage: app.stage },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <ApplicationCard app={app} handleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}
