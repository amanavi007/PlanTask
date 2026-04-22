import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { GripVertical, Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
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
  const [expanded, setExpanded] = useState(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: assignment.id,
    data: { assignment },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const dueDateLabel = assignment.due_date
    ? format(new Date(assignment.due_date), 'EEE MMM d')
    : 'No due date'

  const isSuggested = assignment.source === 'suggested'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-white p-3 shadow-sm transition ${isDragging ? 'opacity-60' : ''}`}
      onClick={() => setExpanded((value) => !value)}
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
            <p className="truncate font-medium text-slate-900">{assignment.title}</p>
            {isSuggested ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                <Lightbulb size={12} />
                Suggested
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">{assignment.courses?.name ?? 'No course'}</p>
          <p className="text-xs text-slate-500">{dueDateLabel}</p>

          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${
              scheduledCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {scheduledCount > 0 ? 'scheduled' : 'not scheduled'}
          </span>
        </div>

        {isSuggested ? (
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            onClick={(event) => {
              event.stopPropagation()
              onDismissSuggestion(assignment.id)
            }}
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-3 border-t border-slate-100 pt-2 text-sm">
          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={assignment.is_complete}
              onChange={(event) => onToggleComplete(assignment.id, event.target.checked)}
              onClick={(event) => event.stopPropagation()}
            />
            Mark complete
          </label>
          <p className="mt-1 text-xs text-slate-500">{scheduledCount} scheduled block(s)</p>
        </div>
      ) : null}
    </div>
  )
}
