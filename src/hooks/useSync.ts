import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { SyncResult } from '../types'

interface SyncIcalResponse {
  result: SyncResult | null
  errorMessage: string | null
}

export function useSync(userId: string | null) {
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  const syncIcal = useCallback(
    async (type: 'canvas' | 'gcal', url: string): Promise<SyncIcalResponse> => {
      if (!userId || !url) {
        return { result: null, errorMessage: 'User session or iCal URL is missing.' }
      }
      setLoading(true)
      setLastError(null)

      const { data, error } = await supabase.functions.invoke('sync-ical', {
        body: { type, url, user_id: userId },
      })

      setLoading(false)

      if (error) {
        console.error(`Failed to sync ${type}`, error)
        let message = error.message

        const maybeContext = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context
        if (maybeContext?.json) {
          try {
            const body = await maybeContext.json()
            if (body?.error) {
              message = body.error
            }
          } catch {
            // Keep default error message.
          }
        }

        setLastError(message)
        return { result: null, errorMessage: message }
      }

      setLastResult(data as SyncResult)
      return { result: data as SyncResult, errorMessage: null }
    },
    [userId],
  )

  return { syncIcal, loading, lastResult, lastError }
}
