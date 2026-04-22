import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Settings } from '../types'

const defaultSettings: Omit<Settings, 'user_id' | 'updated_at'> = {
  canvas_ical_url: null,
  gcal_ical_url: null,
  overload_threshold_hours: 6,
  exam_lookahead_days: 14,
  canvas_last_synced_at: null,
  gcal_last_synced_at: null,
}

export function useSettings(userId: string | null) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setSettings(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId).maybeSingle()

    if (error) {
      console.error('Failed to load settings', error)
      setLoading(false)
      return
    }

    if (!data) {
      const insertPayload = { user_id: userId, ...defaultSettings }
      const { data: inserted, error: insertError } = await supabase
        .from('settings')
        .insert(insertPayload)
        .select('*')
        .single()

      if (insertError) {
        console.error('Failed to create default settings', insertError)
      } else {
        setSettings(inserted as Settings)
      }
    } else {
      setSettings(data as Settings)
    }

    setLoading(false)
  }, [userId])

  const updateSettings = useCallback(
    async (updates: Partial<Omit<Settings, 'user_id'>>) => {
      if (!userId) return false

      const { data, error } = await supabase
        .from('settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select('*')
        .single()

      if (error) {
        console.error('Failed to update settings', error)
        return false
      }

      setSettings(data as Settings)
      return true
    },
    [userId],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { settings, loading, refresh, updateSettings }
}
