import { ChevronDown, ChevronUp, Moon, RefreshCcw, Settings, Sun } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Assignment, CalendarBlock, SyncHistory } from '../types'
import { AssignmentCard } from './AssignmentCard'
import { SuggestionBanner } from './SuggestionBanner'

interface SidebarProps {
  assignments: Assignment[]
  blocks: CalendarBlock[]
  syncHistory: SyncHistory
  suggestionsCount: number
  syncing: boolean
  isDark: boolean
  onToggleDark: () => void
  onDismissBanner: () => void
  onOpenSettings: () => void
  onRefresh: () => void
  onToggleComplete: (assignmentId: string, value: boolean) => void
  onDismissSuggestion: (assignmentId: string) => void
  onScrollToCalendar?: () => void
}

export function Sidebar({
  assignments,
  blocks,
  syncHistory,
  suggestionsCount,
  syncing,
  isDark,
  onToggleDark,
  onDismissBanner,
  onOpenSettings,
  onRefresh,
  onToggleComplete,
  onDismissSuggestion,
  onScrollToCalendar,
}: SidebarProps) {
  const [showImportDetails, setShowImportDetails] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const scheduledByAssignment = useMemo(() => {
    return blocks.reduce<Record<string, number>>((acc, block) => {
      if (!block.assignment_id) return acc
      acc[block.assignment_id] = (acc[block.assignment_id] ?? 0) + 1
      return acc
    }, {})
  }, [blocks])

  const suggested = assignments.filter((assignment) => assignment.source === 'suggested' && !assignment.is_complete)
  const normal = assignments.filter((assignment) => assignment.source !== 'suggested' && !assignment.is_complete)
  const completed = assignments.filter((assignment) => assignment.is_complete)

  const ordered = [...suggested, ...normal]
  const displayAssignments = showCompleted ? [...ordered, ...completed] : ordered

  return (
    <aside className="w-full border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 md:w-[280px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Canvas Study Planner</h1>
        <div className="flex items-center gap-1">
          <button className="rounded p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700" onClick={onToggleDark} title="Toggle dark mode" type="button">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="rounded p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700" onClick={onRefresh} disabled={syncing} title="Sync now" type="button">
            <RefreshCcw size={16} className={syncing ? 'animate-spin' : ''} />
          </button>
          <button className="rounded p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700" onClick={onOpenSettings} title="Settings" type="button">
            <Settings size={16} />
          </button>
        </div>
      </div>

      <SuggestionBanner count={suggestionsCount} onDismiss={onDismissBanner} />

      <section className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <button
          className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
          type="button"
          onClick={() => setShowImportDetails((value) => !value)}
        >
          Import status
          {showImportDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        {showImportDetails ? (
          <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">
            <p>Canvas: {syncHistory.canvasLastSync ? new Date(syncHistory.canvasLastSync).toLocaleString() : 'Never'}</p>
            <p>Google Calendar: {syncHistory.gcalLastSync ? new Date(syncHistory.gcalLastSync).toLocaleString() : 'Never'}</p>
          </div>
        ) : null}
      </section>

      <div className="mt-3 max-h-[calc(100vh-290px)] space-y-2 overflow-y-auto pr-1">
        {displayAssignments.map((assignment) => (
          <AssignmentCard
            key={assignment.id}
            assignment={assignment}
            scheduledCount={scheduledByAssignment[assignment.id] ?? 0}
            onToggleComplete={onToggleComplete}
            onDismissSuggestion={onDismissSuggestion}
          />
        ))}
      </div>

      <button
        type="button"
        className="mt-3 text-xs text-slate-500 underline dark:text-slate-500"
        onClick={() => setShowCompleted((value) => !value)}
      >
        {showCompleted ? 'Hide completed' : `Show completed (${completed.length})`}
      </button>

      {onScrollToCalendar ? (
        <button type="button" className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-600 md:hidden" onClick={onScrollToCalendar}>
          View Calendar
        </button>
      ) : null}
    </aside>
  )
}
