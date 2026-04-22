import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Course, Settings } from '../types'

interface SettingsPageProps {
  email: string
  settings: Settings | null
  courses: Course[]
  onClose: () => void
  onUpdateSettings: (updates: Partial<Omit<Settings, 'user_id'>>) => Promise<boolean>
  onUpdateCourse: (courseId: string, updates: Partial<Pick<Course, 'name' | 'color'>>) => Promise<void>
  onManualSync: (type: 'canvas' | 'gcal', urlOverride?: string) => Promise<{ ok: boolean; message: string }>
}

export function SettingsPage({
  email,
  settings,
  courses,
  onClose,
  onUpdateSettings,
  onUpdateCourse,
  onManualSync,
}: SettingsPageProps) {
  const [resetMessage, setResetMessage] = useState<string | null>(null)
  const [canvasUrl, setCanvasUrl] = useState('')
  const [gcalUrl, setGcalUrl] = useState('')
  const [syncingType, setSyncingType] = useState<'canvas' | 'gcal' | null>(null)
  const [syncMessage, setSyncMessage] = useState<{ type: 'canvas' | 'gcal'; tone: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setCanvasUrl(settings?.canvas_ical_url ?? '')
    setGcalUrl(settings?.gcal_ical_url ?? '')
  }, [settings?.canvas_ical_url, settings?.gcal_ical_url])

  const handlePasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    if (error) {
      setResetMessage(error.message)
      return
    }

    setResetMessage('Password reset email sent.')
  }

  const handleSync = async (type: 'canvas' | 'gcal') => {
    const url = (type === 'canvas' ? canvasUrl : gcalUrl).trim()
    setSyncingType(type)
    const result = await onManualSync(type, url)
    setSyncingType(null)
    setSyncMessage({
      type,
      tone: result.ok ? 'success' : 'error',
      text: result.message,
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 dark:bg-slate-900 md:p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h2>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300" onClick={onClose} type="button">
            Back to planner
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Integrations</h3>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300">Canvas iCal URL</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={canvasUrl}
                  onChange={(event) => setCanvasUrl(event.target.value)}
                  onBlur={() => {
                    void onUpdateSettings({ canvas_ical_url: canvasUrl.trim() })
                  }}
                />
                <button
                  className="rounded-lg bg-cyan-600 px-3 py-2 text-white disabled:opacity-60 dark:bg-cyan-700"
                  onClick={() => void handleSync('canvas')}
                  type="button"
                  disabled={syncingType !== null}
                >
                  {syncingType === 'canvas' ? 'Syncing...' : 'Sync now'}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last synced: {settings?.canvas_last_synced_at ? new Date(settings.canvas_last_synced_at).toLocaleString() : 'Never'}</p>
              {syncMessage?.type === 'canvas' ? (
                <p className={`mt-1 text-xs ${syncMessage.tone === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{syncMessage.text}</p>
              ) : null}
            </div>

            <div>
              <label className="font-medium text-slate-700 dark:text-slate-300">Google Calendar iCal URL</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={gcalUrl}
                  onChange={(event) => setGcalUrl(event.target.value)}
                  onBlur={() => {
                    void onUpdateSettings({ gcal_ical_url: gcalUrl.trim() })
                  }}
                />
                <button
                  className="rounded-lg bg-cyan-600 px-3 py-2 text-white disabled:opacity-60 dark:bg-cyan-700"
                  onClick={() => void handleSync('gcal')}
                  type="button"
                  disabled={syncingType !== null}
                >
                  {syncingType === 'gcal' ? 'Syncing...' : 'Sync now'}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Last synced: {settings?.gcal_last_synced_at ? new Date(settings.gcal_last_synced_at).toLocaleString() : 'Never'}</p>
              {syncMessage?.type === 'gcal' ? (
                <p className={`mt-1 text-xs ${syncMessage.tone === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>{syncMessage.text}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Planner preferences</h3>
          <div className="mt-3 space-y-3 text-sm">
            <label className="block">
              <span className="font-medium text-slate-700 dark:text-slate-300">Warn me when I schedule more than X hours in a day</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                type="number"
                value={settings?.overload_threshold_hours ?? 6}
                onChange={(event) => {
                  void onUpdateSettings({ overload_threshold_hours: Number(event.target.value) })
                }}
              />
            </label>

            <label className="block">
              <span className="font-medium text-slate-700 dark:text-slate-300">Suggest study sessions for exams within X days</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                type="number"
                value={settings?.exam_lookahead_days ?? 14}
                onChange={(event) => {
                  void onUpdateSettings({ exam_lookahead_days: Number(event.target.value) })
                }}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Courses</h3>
          <div className="mt-3 space-y-2">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center gap-2">
                <input
                  type="color"
                  value={course.color}
                  onChange={(event) => {
                    void onUpdateCourse(course.id, { color: event.target.value })
                  }}
                />
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={course.name}
                  onChange={(event) => {
                    void onUpdateCourse(course.id, { name: event.target.value })
                  }}
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Account</h3>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{email}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:text-slate-300" onClick={() => void handlePasswordReset()} type="button">
              Change password (email link)
            </button>
            <button
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white"
              type="button"
              onClick={() => {
                void supabase.auth.signOut()
              }}
            >
              Log out
            </button>
          </div>
          {resetMessage ? <p className="mt-2 text-xs text-slate-600">{resetMessage}</p> : null}
        </section>
      </div>
    </div>
  )
}
