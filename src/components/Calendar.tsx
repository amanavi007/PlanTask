import { useDndMonitor, useDroppable } from '@dnd-kit/core'
import { addDays, addWeeks, endOfWeek, format, isSameDay, startOfDay, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Assignment, BlockDraft, CalendarBlock } from '../types'
import { CalendarBlockItem } from './CalendarBlock'
import { OverloadWarning } from './OverloadWarning'

const HOUR_HEIGHT = 60
const DAY_START_HOUR = 5
const VISIBLE_HOURS = 24 - DAY_START_HOUR

interface CalendarProps {
  assignments: Assignment[]
  blocks: CalendarBlock[]
  overloadThreshold: number
  onCreateDraftFromDrop: (draft: BlockDraft) => void
  onEditBlock: (block: CalendarBlock) => void
  onResizeBlock: (blockId: string, newEndTime: string) => void
  onToggleSkipBlock: (block: CalendarBlock) => void
  onSkipAllByTitle: (title: string) => void
}

interface DayColumnProps {
  day: Date
  children: React.ReactNode
}

function DayColumn({ day, children }: DayColumnProps) {
  const droppable = useDroppable({
    id: `day-${day.toISOString()}`,
    data: {
      dayIso: day.toISOString(),
    },
  })

  return (
    <div
      ref={droppable.setNodeRef}
      className={`relative min-w-[140px] border-l border-slate-100 dark:border-slate-700/60 ${droppable.isOver ? 'bg-cyan-50 dark:bg-cyan-950/30' : ''}`}
      data-day-column={day.toISOString()}
    >
      {children}
    </div>
  )
}

export function Calendar({
  assignments,
  blocks,
  overloadThreshold,
  onCreateDraftFromDrop,
  onEditBlock,
  onResizeBlock,
  onToggleSkipBlock,
  onSkipAllByTitle,
}: CalendarProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [mobileDayIndex, setMobileDayIndex] = useState(0)
  const [slideDir, setSlideDir] = useState<'forward' | 'back'>('forward')
  const [animKey, setAnimKey] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const goBack = () => {
    setSlideDir('back')
    setAnimKey((k) => k + 1)
    setWeekStart((prev) => addWeeks(prev, -1))
  }
  const goForward = () => {
    setSlideDir('forward')
    setAnimKey((k) => k + 1)
    setWeekStart((prev) => addWeeks(prev, 1))
  }

  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => addDays(weekStart, index))
  }, [weekStart])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [])

  useDndMonitor({
    onDragEnd: (event) => {
      const assignment = event.active.data.current?.assignment as Assignment | undefined
      const overDayIso = event.over?.data.current?.dayIso as string | undefined
      if (!assignment || !overDayIso) return

      const pointer = event.activatorEvent
      const dayColumn = document.querySelector(`[data-day-column="${overDayIso}"]`) as HTMLElement | null
      if (!dayColumn || !scrollRef.current || !(pointer instanceof MouseEvent || pointer instanceof PointerEvent)) {
        return
      }

      const rect = dayColumn.getBoundingClientRect()
      const relativeY = pointer.clientY - rect.top + scrollRef.current.scrollTop
      const boundedY = Math.max(0, Math.min(VISIBLE_HOURS * HOUR_HEIGHT - 30, relativeY))
      const minutesFromDayStart = Math.round(boundedY)

      const start = startOfDay(new Date(overDayIso))
      start.setMinutes(DAY_START_HOUR * 60 + minutesFromDayStart)

      onCreateDraftFromDrop({
        assignment_id: assignment.id,
        title: assignment.title,
        start_time: format(start, "yyyy-MM-dd'T'HH:mm"),
        durationHours: 1,
        notes: '',
        source: assignment.source === 'canvas' ? 'canvas' : 'manual',
      })
    },
  })

  const blocksByDay = useMemo(() => {
    return days.map((day) =>
      blocks.filter((block) => isSameDay(new Date(block.start_time), day)),
    )
  }, [blocks, days])

  const courseColorByAssignment = useMemo(() => {
    return assignments.reduce<Record<string, string>>((acc, assignment) => {
      acc[assignment.id] = assignment.courses?.color ?? '#7F77DD'
      return acc
    }, {})
  }, [assignments])

  const scheduledHoursByDay = useMemo(() => {
    return blocksByDay.map((dayBlocks) =>
      dayBlocks
        .filter((block) => block.source !== 'gcal')
        .reduce((hours, block) => {
          const duration = (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / (1000 * 60 * 60)
          return hours + Math.max(duration, 0)
        }, 0),
    )
  }, [blocksByDay])

  const handleResizeStart = (block: CalendarBlock, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const initialY = event.clientY
    const initialEnd = new Date(block.end_time)

    const onMouseUp = (upEvent: MouseEvent) => {
      const deltaPx = upEvent.clientY - initialY
      const deltaMinutes = Math.round(deltaPx)
      const nextEnd = new Date(initialEnd.getTime() + deltaMinutes * 60 * 1000)
      onResizeBlock(block.id, nextEnd.toISOString())
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mouseup', onMouseUp)
  }

  const showMobile = window.innerWidth < 768

  return (
    <section className="flex-1 overflow-hidden dark:bg-slate-900" id="planner-calendar">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <button type="button" className="rounded border border-slate-200 p-1 dark:border-slate-600 dark:text-slate-300" onClick={goBack}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="rounded border border-slate-200 p-1 dark:border-slate-600 dark:text-slate-300" onClick={goForward}>
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            className="rounded border border-slate-200 px-2 py-1 text-sm dark:border-slate-600 dark:text-slate-300"
            onClick={() => { setSlideDir('forward'); setAnimKey((k) => k + 1); setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })) }}
          >
            Today
          </button>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {format(weekStart, 'MMM d')} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d')}
        </p>
      </header>

      <div className="border-b border-slate-100 px-2 py-2 dark:border-slate-700 md:hidden">
        <div className="flex gap-1 overflow-x-auto">
          {days.map((day, index) => (
            <button
              key={day.toISOString()}
              type="button"
              className={`rounded-full px-3 py-1 text-xs ${mobileDayIndex === index ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}
              onClick={() => setMobileDayIndex(index)}
            >
              {format(day, 'EEE d')}
            </button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="h-[calc(100vh-160px)] overflow-y-auto overflow-x-hidden dark:bg-slate-900">
        <div
          key={animKey}
          className={`flex ${slideDir === 'forward' ? 'animate-slide-from-right' : 'animate-slide-from-left'}`}
        >
          {days.map((day, index) => {
            if (showMobile && index !== mobileDayIndex) return null

            const dayBlocks = blocksByDay[index]
            const overloadHours = scheduledHoursByDay[index]

            return (
              <div key={day.toISOString()} className="flex flex-1 min-w-0 flex-col">
                <div className={`sticky top-0 z-10 border-b border-slate-200 bg-white p-2 text-center dark:border-slate-700 dark:bg-slate-900 ${isSameDay(day, new Date()) ? 'bg-cyan-50 dark:bg-cyan-950/40' : ''}`}>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{format(day, 'EEE d')}</p>
                  <OverloadWarning hours={overloadHours} threshold={overloadThreshold} />
                </div>

                <DayColumn day={day}>
                  <div className="relative" style={{ height: VISIBLE_HOURS * HOUR_HEIGHT }}>
                    {Array.from({ length: VISIBLE_HOURS }).map((_, index) => {
                      const hour = DAY_START_HOUR + index
                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className="absolute left-0 right-0 border-t border-dashed border-slate-100 text-[10px] text-slate-400 dark:border-slate-700/60"
                          style={{ top: index * HOUR_HEIGHT }}
                        >
                          <span className="-translate-y-1/2 rounded bg-white px-1 dark:bg-slate-900 dark:text-slate-500">{String(hour).padStart(2, '0')}:00</span>
                        </div>
                      )
                    })}

                    {dayBlocks.map((block) => {
                      const start = new Date(block.start_time)
                      const end = new Date(block.end_time)
                      const top = (start.getHours() - DAY_START_HOUR) * HOUR_HEIGHT + start.getMinutes()
                      const height = Math.max((end.getTime() - start.getTime()) / (1000 * 60), 30)

                      const linkedAssignment = assignments.find((assignment) => assignment.id === block.assignment_id)
                      const title = linkedAssignment?.title ?? block.title ?? 'Untitled'
                      const subtitle = linkedAssignment?.courses?.name ?? (block.source === 'gcal' ? 'Google Calendar' : 'No course')
                      const color = linkedAssignment ? courseColorByAssignment[linkedAssignment.id] : '#378ADD'

                      return (
                        <CalendarBlockItem
                          key={block.id}
                          block={block}
                          top={top}
                          height={height}
                          title={title}
                          subtitle={subtitle}
                          color={color}
                          onOpen={onEditBlock}
                          onResizeStart={handleResizeStart}
                          onToggleSkip={onToggleSkipBlock}
                          onSkipAllByTitle={onSkipAllByTitle}
                        />
                      )
                    })}
                  </div>
                </DayColumn>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
