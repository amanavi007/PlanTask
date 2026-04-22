import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function normalizeSupabaseUrl(url: string | undefined): string {
  if (!url) return ''
  return url.replace(/\/rest\/v1\/?$/, '')
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl)

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Auth and data operations will fail until configured.')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
