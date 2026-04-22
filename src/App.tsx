import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { addHours, format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthScreen } from './components/AuthScreen'
import { BlockModal } from './components/BlockModal'
import { Calendar } from './components/Calendar'
import { SettingsPage } from './components/SettingsPage'
import { Sidebar } from './components/Sidebar'
import { useAssignments } from './hooks/useAssignments'
import { useCalendarBlocks } from './hooks/useCalendarBlocks'
import { useCourses } from './hooks/useCourses'
import { useSettings } from './hooks/useSettings'
import { useSync } from './hooks/useSync'
import { supabase } from './lib/supabase'
import type { BlockDraft, CalendarBlock, SyncHistory } from './types'

interface SyncOutcome {
  ok: boolean
  message: string
}

function Planner() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [suggestionBannerCount, setSuggestionBannerCount] = useState(0)
  const [draft, setDraft] = useState<BlockDraft | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [loadingSession, setLoadingSession] = useState(true)
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const { assignments, refresh: refreshAssignments, updateAssignment } = useAssignments(userId)
  const { blocks, refresh: refreshBlocks, saveBlock, removeBlock } = useCalendarBlocks(userId)
  const { courses, updateCourse } = useCourses(userId)
  const { settings, updateSettings, refresh: refreshSettings } = useSettings(userId)
  const { syncIcal, loading: syncing } = useSync(userId)

  const syncHistory: SyncHistory = {
    canvasLastSync: settings?.canvas_last_synced_at ?? null,
    gcalLastSync: settings?.gcal_last_synced_at ?? null,
  }

  useEffect(() => {
    const initialize = async () => {
      const { data } = await supabase.auth.getSession()
      setUserId(data.session?.user.id ?? null)
      setEmail(data.session?.user.email ?? '')
      setLoadingSession(false)
    }

    void initialize()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
      setEmail(session?.user.email ?? '')
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const performSync = async (type: 'canvas' | 'gcal', urlOverride?: string): Promise<SyncOutcome> => {
    if (!settings) {
      return { ok: false, message: 'Settings are still loading.' }
    }

    const url = (urlOverride ?? (type === 'canvas' ? settings.canvas_ical_url : settings.gcal_ical_url) ?? '').trim()
    if (!url) {
      return { ok: false, message: 'Please add an iCal URL first.' }
    }

    if (type === 'canvas' && settings.canvas_ical_url !== url) {
      await updateSettings({ canvas_ical_url: url })
    }

    if (type === 'gcal' && settings.gcal_ical_url !== url) {
      await updateSettings({ gcal_ical_url: url })
    }

    const { result, errorMessage } = await syncIcal(type, url)
    if (!result) {
      return { ok: false, message: errorMessage ?? `Sync failed for ${type}. Check function logs.` }
    }

    const timestamp = new Date().toISOString()
    if (type === 'canvas') {
      await updateSettings({ canvas_last_synced_at: timestamp })
      if (result.suggestions > 0) {
        setSuggestionBannerCount(result.suggestions)
      }
    } else {
      await updateSettings({ gcal_last_synced_at: timestamp })
    }

    await Promise.all([refreshAssignments(), refreshBlocks(), refreshSettings()])
    return {
      ok: true,
      message: `Synced ${type}: ${result.inserted} inserted, ${result.updated} updated, ${result.suggestions} suggestions.`,
    }
  }

  useEffect(() => {
    if (!settings) return
    if (settings.canvas_ical_url) {
      void performSync('canvas')
    }
    if (settings.gcal_ical_url) {
      void performSync('gcal')
    }
    // Initial sync for configured feeds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.user_id])

  const handleGlobalRefresh = async () => {
    await Promise.all([performSync('canvas'), performSync('gcal'), refreshAssignments(), refreshBlocks(), refreshSettings()])
  }

  const handleSaveDraft = async (nextDraft: BlockDraft) => {
    const start = new Date(nextDraft.start_time)
    const end = addHours(start, nextDraft.durationHours)

    const success = await saveBlock({
      id: nextDraft.id,
      assignment_id: nextDraft.assignment_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      notes: nextDraft.notes,
      is_done: nextDraft.is_done,
      source: nextDraft.source,
      title: nextDraft.title,
    })

    if (success) {
      setDraft(null)
      await refreshBlocks()
    }
  }

  const handleEditBlock = (block: CalendarBlock) => {
    if (block.source === 'gcal') return

    const start = new Date(block.start_time)
    const end = new Date(block.end_time)
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

    const assignment = assignments.find((item) => item.id === block.assignment_id)

    setModalMode('edit')
    setDraft({
      id: block.id,
      assignment_id: block.assignment_id,
      title: assignment?.title ?? block.title ?? 'Untitled block',
      start_time: format(start, "yyyy-MM-dd'T'HH:mm"),
      durationHours: Math.max(durationHours, 0.5),
      notes: block.notes ?? '',
      is_done: block.is_done,
      source: block.source,
    })
  }

  if (loadingSession) {
    return <div className="p-8 text-sm text-slate-600">Loading...</div>
  }

  if (!userId) {
    return <AuthScreen />
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <DndContext sensors={sensors}>
            <main className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
              <Sidebar
                assignments={assignments}
                blocks={blocks}
                syncHistory={syncHistory}
                suggestionsCount={suggestionBannerCount}
                syncing={syncing}
                isDark={isDark}
                onToggleDark={() => setIsDark((d) => !d)}
                onDismissBanner={() => setSuggestionBannerCount(0)}
                onOpenSettings={() => navigate('/settings')}
                onRefresh={() => void handleGlobalRefresh()}
                onToggleComplete={(assignmentId, value) => void updateAssignment(assignmentId, { is_complete: value })}
                onDismissSuggestion={(assignmentId) => void updateAssignment(assignmentId, { is_dismissed: true })}
                onScrollToCalendar={() => {
                  document.getElementById('planner-calendar')?.scrollIntoView({ behavior: 'smooth' })
                }}
              />

              <Calendar
                assignments={assignments}
                blocks={blocks}
                overloadThreshold={settings?.overload_threshold_hours ?? 6}
                onCreateDraftFromDrop={(nextDraft) => {
                  setModalMode('create')
                  setDraft(nextDraft)
                }}
                onEditBlock={handleEditBlock}
                onToggleSkipBlock={(block) => {
                  void saveBlock({
                    id: block.id,
                    assignment_id: block.assignment_id,
                    start_time: block.start_time,
                    end_time: block.end_time,
                    notes: block.notes,
                    is_done: !block.is_done,
                    source: block.source,
                    title: block.title,
                  })
                }}
                onSkipAllByTitle={(title) => {
                  const targets = blocks.filter((b) => b.source === 'gcal' && b.title === title && !b.is_done)
                  for (const block of targets) {
                    void saveBlock({
                      id: block.id,
                      assignment_id: block.assignment_id,
                      start_time: block.start_time,
                      end_time: block.end_time,
                      notes: block.notes,
                      is_done: true,
                      source: block.source,
                      title: block.title,
                    })
                  }
                }}
                onResizeBlock={(blockId, newEndTime) => {
                  const block = blocks.find((item) => item.id === blockId)
                  if (!block || block.source === 'gcal') return
                  void saveBlock({
                    id: blockId,
                    assignment_id: block.assignment_id,
                    start_time: block.start_time,
                    end_time: newEndTime,
                    notes: block.notes,
                    is_done: block.is_done,
                    source: block.source,
                    title: block.title,
                  })
                }}
              />

              <BlockModal
                open={Boolean(draft)}
                mode={modalMode}
                draft={draft}
                onClose={() => setDraft(null)}
                onSave={(nextDraft) => void handleSaveDraft(nextDraft)}
                onDelete={(blockId) => {
                  void removeBlock(blockId)
                  setDraft(null)
                }}
              />
            </main>
          </DndContext>
        }
      />

      <Route
        path="/settings"
        element={
          <SettingsPage
            email={email}
            settings={settings}
            courses={courses}
            onClose={() => navigate('/')}
            onUpdateSettings={updateSettings}
            onUpdateCourse={updateCourse}
            onManualSync={performSync}
          />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default Planner
