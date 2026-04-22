export type AssignmentSource = 'canvas' | 'manual' | 'suggested'
export type CalendarBlockSource = 'canvas' | 'gcal' | 'manual'

export interface Course {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Assignment {
  id: string
  user_id: string
  title: string
  course_id: string | null
  due_date: string | null
  is_complete: boolean
  source: AssignmentSource
  is_dismissed: boolean
  created_at: string
  courses?: Course | null
}

export interface CalendarBlock {
  id: string
  user_id: string
  assignment_id: string | null
  start_time: string
  end_time: string
  notes: string | null
  is_done: boolean
  source: CalendarBlockSource
  gcal_event_id: string | null
  title: string | null
  created_at: string
  assignments?: Assignment | null
}

export interface Settings {
  user_id: string
  canvas_ical_url: string | null
  gcal_ical_url: string | null
  overload_threshold_hours: number
  exam_lookahead_days: number
  canvas_last_synced_at: string | null
  gcal_last_synced_at: string | null
  updated_at: string
}

export interface SyncResult {
  inserted: number
  updated: number
  suggestions: number
}

export interface SyncHistory {
  canvasLastSync: string | null
  gcalLastSync: string | null
}

export interface BlockDraft {
  id?: string
  assignment_id: string | null
  title: string
  start_time: string
  durationHours: number
  notes: string
  is_done?: boolean
  source: CalendarBlockSource
}
