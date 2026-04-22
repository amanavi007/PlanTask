import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Assignment } from '../types'

interface UpdateAssignmentPayload {
  is_complete?: boolean
  is_dismissed?: boolean
}

export function useAssignments(userId: string | null) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setAssignments([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('assignments')
      .select('*, courses(*)')
      .eq('user_id', userId)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Failed to load assignments', error)
    } else {
      setAssignments((data ?? []) as Assignment[])
    }

    setLoading(false)
  }, [userId])

  const updateAssignment = useCallback(
    async (assignmentId: string, payload: UpdateAssignmentPayload) => {
      if (!userId) return

      const { error } = await supabase
        .from('assignments')
        .update(payload)
        .eq('id', assignmentId)
        .eq('user_id', userId)

      if (error) {
        console.error('Failed to update assignment', error)
      } else {
        setAssignments((prev) =>
          prev.map((assignment) =>
            assignment.id === assignmentId ? { ...assignment, ...payload } : assignment,
          ),
        )
      }
    },
    [userId],
  )

  const visibleAssignments = useMemo(
    () => assignments.filter((assignment) => !assignment.is_dismissed),
    [assignments],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { assignments: visibleAssignments, loading, refresh, updateAssignment }
}
