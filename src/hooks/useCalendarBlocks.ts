import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CalendarBlock } from '../types'

interface BlockInput {
  id?: string
  assignment_id?: string | null
  start_time: string
  end_time: string
  notes?: string | null
  is_done?: boolean
  source?: 'canvas' | 'gcal' | 'manual'
  title?: string | null
}

export function useCalendarBlocks(userId: string | null) {
  const [blocks, setBlocks] = useState<CalendarBlock[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setBlocks([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('calendar_blocks')
      .select('*, assignments(*, courses(*))')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Failed to load calendar blocks', error)
    } else {
      setBlocks((data ?? []) as CalendarBlock[])
    }

    setLoading(false)
  }, [userId])

  const saveBlock = useCallback(
    async (input: BlockInput) => {
      if (!userId) return false

      const payload = {
        user_id: userId,
        assignment_id: input.assignment_id ?? null,
        start_time: input.start_time,
        end_time: input.end_time,
        notes: input.notes ?? null,
        is_done: input.is_done ?? false,
        source: input.source ?? 'manual',
        title: input.title ?? null,
      }

      const query = input.id
        ? supabase.from('calendar_blocks').update(payload).eq('id', input.id).eq('user_id', userId)
        : supabase.from('calendar_blocks').insert(payload)

      const { error } = await query

      if (error) {
        console.error('Failed to save block', error)
        return false
      }

      await refresh()
      return true
    },
    [refresh, userId],
  )

  const removeBlock = useCallback(
    async (blockId: string) => {
      if (!userId) return false

      const { error } = await supabase
        .from('calendar_blocks')
        .delete()
        .eq('id', blockId)
        .eq('user_id', userId)

      if (error) {
        console.error('Failed to delete block', error)
        return false
      }

      await refresh()
      return true
    },
    [refresh, userId],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { blocks, loading, refresh, saveBlock, removeBlock }
}
