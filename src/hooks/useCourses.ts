import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Course } from '../types'

export function useCourses(userId: string | null) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setCourses([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to load courses', error)
    } else {
      setCourses((data ?? []) as Course[])
    }

    setLoading(false)
  }, [userId])

  const updateCourse = useCallback(
    async (courseId: string, updates: Partial<Pick<Course, 'name' | 'color'>>) => {
      if (!userId) return

      const { error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', courseId)
        .eq('user_id', userId)

      if (error) {
        console.error('Failed to update course', error)
        return
      }

      await refresh()
    },
    [refresh, userId],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { courses, loading, refresh, updateCourse }
}
