import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { addHours, format } from 'date-fns'
import type { BlockDraft } from '../types'

interface BlockModalProps {
  open: boolean
  mode: 'create' | 'edit'
  draft: BlockDraft | null
  onClose: () => void
  onSave: (draft: BlockDraft) => void
  onDelete?: (blockId: string) => void
}

export function BlockModal({ open, mode, draft, onClose, onSave, onDelete }: BlockModalProps) {
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState(1)
  const [notes, setNotes] = useState('')
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    if (!draft || !open) return
    setStartTime(draft.start_time)
    setDuration(draft.durationHours)
    setNotes(draft.notes)
    setIsDone(Boolean(draft.is_done))
  }, [draft, open])

  if (!open || !draft) return null

  const effectiveStart = startTime || draft.start_time
  const endTime = format(addHours(new Date(effectiveStart), duration), "yyyy-MM-dd'T'HH:mm")

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    onSave({
      ...draft,
      start_time: startTime,
      durationHours: Number(duration),
      notes,
      is_done: isDone,
    })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
      <form className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-800" onSubmit={handleSubmit}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{mode === 'create' ? 'Create study block' : 'Edit block'}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">{draft.title}</p>

        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Start time</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          type="datetime-local"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
        />

        <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">Duration (hours)</label>
        <input
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          type="number"
          min={0.5}
          step={0.5}
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
          required
        />

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">End time: {format(new Date(endTime), 'PPP p')}</p>

        <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
        <textarea
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        {mode === 'edit' ? (
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={isDone} onChange={(event) => setIsDone(event.target.checked)} />
            Session done
          </label>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-2">
          {mode === 'edit' && draft.id && onDelete ? (
            <button
              type="button"
              className="rounded-lg border border-rose-300 px-3 py-2 text-rose-700"
              onClick={() => {
                if (window.confirm('Delete this block?')) {
                  onDelete(draft.id as string)
                }
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:text-slate-300" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-cyan-600 px-3 py-2 font-medium text-white">
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
