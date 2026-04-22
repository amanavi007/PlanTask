import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import confetti from 'canvas-confetti'
import { differenceInDays, format } from 'date-fns'
import { GripVertical, Lightbulb, X } from 'lucide-react'
import type React from 'react'
import type { Assignment } from '../types'

interface AssignmentCardProps {
  assignment: Assignment
  scheduledCount: number
  onToggleComplete: (assignmentId: string, value: boolean) => void
  onDismissSuggestion: (assignmentId: string) => void
}

export function AssignmentCard({
  assignment,
  scheduledCount,
  onToggleComplete,
  onDismissSuggestion,
}: AssignmentCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: assignment.id,
    data: { assignment },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const isSuggested = assignment.source === 'suggested'

  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null
  const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null
  const dueDateLabel = dueDate ? format(dueDate, 'EEE MMM d') : 'No due date'
  const dueDateColor =
    daysUntilDue === null
      ? 'text-slate-400'
      : daysUntilDue <= 1
        ? 'text-rose-600 font-semibold'
        : daysUntilDue <= 5
          ? 'text-amber-600 font-medium'
          : 'text-slate-600'

  const handleToggleComplete = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const checked = event.target.checked
    if (checked) {
      void confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
    }
    onToggleComplete(assignment.id, checked)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-white p-3 shadow-sm transition ${isDragging ? 'opacity-60' : ''} ${assignment.is_complete ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: assignment.courses?.color ?? '#7F77DD' }} />
        <button
          type="button"
          className="mt-0.5 rounded p-1 text-slate-500 hover:bg-slate-100"
          {...listeners}
          {...attributes}
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical size={15} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={`truncate font-medium ${assignment.is_complete ? 'line-through text-slate-400' : 'text-slate-900'}`}>
              {assignment.title}
            </p>
            {isSuggested ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                <Lightbulb size={12} />
                Suggested
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400">{assignment.courses?.name ?? 'No course'}</p>
          <p className={`text-xs ${dueDateColor}`}>Due {dueDateLabel}</p>

          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                scheduledCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {scheduledCount > 0 ? 'scheduled' : 'not scheduled'}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isSuggested ? (
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-100"
              onClick={(event) => {
                event.stopPropagation()
                onDismissSuggestion(assignment.id)
              }}
            >
              <X size={14} />
            </button>
          ) : null}
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-emerald-500"
            checked={assignment.is_complete}
            onChange={handleToggleComplete}
            onClick={(event) => event.stopPropagation()}
            title="Mark complete"
          />
        </div>
      </div>
    </div>
  )
}
