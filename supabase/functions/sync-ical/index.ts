import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import ICAL from 'npm:ical.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const palette = ['#7F77DD', '#1D9E75', '#D85A30', '#378ADD', '#D4537E', '#639922', '#BA7517', '#E24B4A']
const suggestionKeywords = ['midterm', 'exam', 'final', 'quiz', 'test', 'project', 'presentation']

type SyncBody = {
  type: 'canvas' | 'gcal'
  url: string
  user_id: string
}

function normalizeIcalUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()
  if (trimmed.toLowerCase().startsWith('webcal://')) {
    return `https://${trimmed.slice('webcal://'.length)}`
  }
  return trimmed
}

function parseDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof ICAL.Time) {
    return value.toJSDate()
  }
  try {
    return new Date(String(value))
  } catch {
    return null
  }
}

function normalizeCourseName(description: string | null): string | null {
  if (!description) return null
  const lines = description.split(/\r?\n/)
  const maybeCourse = lines.find((line) => /course|class/i.test(line))
  const raw = maybeCourse ?? lines[0]
  if (!raw) return null
  return raw.replace(/(course|class)\s*:?/i, '').trim() || null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await request.json()) as SyncBody

    if (!body.type || !body.url || !body.user_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedUrl = normalizeIcalUrl(body.url)

    try {
      const parsed = new URL(normalizedUrl)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return new Response(JSON.stringify({ error: 'iCal URL must use http(s) or webcal scheme' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid iCal URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRole) {
      return new Response(JSON.stringify({ error: 'Missing Supabase environment configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole)

    const feedResponse = await fetch(normalizedUrl)
    if (!feedResponse.ok) {
      const preview = (await feedResponse.text()).slice(0, 240)
      return new Response(
        JSON.stringify({
          error: `Unable to fetch iCal URL (${feedResponse.status} ${feedResponse.statusText})`,
          details: preview,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const text = await feedResponse.text()

    if (!text.includes('BEGIN:VCALENDAR')) {
      const isGoogleWebUrl = normalizedUrl.includes('calendar.google.com/calendar/u/') || normalizedUrl.includes('/calendar?cid=')
      return new Response(
        JSON.stringify({
          error: isGoogleWebUrl
            ? 'Google URL must be an iCal (.ics) feed URL, not the Calendar web page URL.'
            : 'The provided URL did not return valid iCal content (missing BEGIN:VCALENDAR).',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let jcalData: ReturnType<typeof ICAL.parse>
    try {
      jcalData = ICAL.parse(text)
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: `Unable to parse iCal feed: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const calendar = new ICAL.Component(jcalData)
    const vevents = calendar.getAllSubcomponents('vevent')

    let inserted = 0
    let updated = 0
    let suggestions = 0

    if (body.type === 'canvas') {
      const { data: userSettings } = await supabase
        .from('settings')
        .select('exam_lookahead_days')
        .eq('user_id', body.user_id)
        .maybeSingle()

      const lookaheadDays = userSettings?.exam_lookahead_days ?? 14

      const { data: existingCourses } = await supabase
        .from('courses')
        .select('id, name')
        .eq('user_id', body.user_id)

      const courseIdByName = new Map<string, string>()
      ;(existingCourses ?? []).forEach((course) => {
        courseIdByName.set(course.name.trim().toLowerCase(), course.id)
      })

      const missingCourseNames = new Set<string>()

      const parsedEvents = vevents
        .map((event) => {
          const component = new ICAL.Event(event)
          const title = component.summary?.trim()
          const dueDate = parseDate(component.startDate)
          const description = component.description ?? null
          const courseName = normalizeCourseName(description)

          if (!title || !dueDate) return null
          if (!Number.isFinite(dueDate.getTime())) return null

          if (courseName && !courseIdByName.has(courseName.toLowerCase())) {
            missingCourseNames.add(courseName)
          }

          return {
            title,
            due_date: dueDate.toISOString(),
            course_name: courseName,
          }
        })
        .filter(Boolean) as Array<{ title: string; due_date: string; course_name: string | null }>

      if (missingCourseNames.size > 0) {
        const sortedMissing = Array.from(missingCourseNames).sort((a, b) => a.localeCompare(b))
        const existingCount = existingCourses?.length ?? 0

        const toInsert = sortedMissing.map((name, index) => ({
          user_id: body.user_id,
          name,
          color: palette[(existingCount + index) % palette.length],
        }))

        const { data: createdCourses } = await supabase.from('courses').insert(toInsert).select('id, name')

        ;(createdCourses ?? []).forEach((course) => {
          courseIdByName.set(course.name.trim().toLowerCase(), course.id)
        })
      }

      const now = new Date()
      const lookaheadBoundary = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000)

      for (const event of parsedEvents) {
        const courseId = event.course_name ? courseIdByName.get(event.course_name.toLowerCase()) ?? null : null

        const { data: existingAssignment } = await supabase
          .from('assignments')
          .select('id')
          .eq('user_id', body.user_id)
          .eq('title', event.title)
          .eq('due_date', event.due_date)
          .maybeSingle()

        const { error } = await supabase.from('assignments').upsert(
          {
            user_id: body.user_id,
            title: event.title,
            course_id: courseId,
            due_date: event.due_date,
            source: 'canvas',
          },
          { onConflict: 'user_id,title,due_date' },
        )

        if (!error) {
          if (existingAssignment) {
            updated += 1
          } else {
            inserted += 1
          }
        }

        const lowerTitle = event.title.toLowerCase()
        const hasKeyword = suggestionKeywords.some((keyword) => lowerTitle.includes(keyword))
        const dueDate = new Date(event.due_date)

        if (!hasKeyword || dueDate < now || dueDate > lookaheadBoundary) {
          continue
        }

        const suggestedTitle = `Study for: ${event.title}`
        const { data: existingSuggestion } = await supabase
          .from('assignments')
          .select('id, is_dismissed')
          .eq('user_id', body.user_id)
          .eq('title', suggestedTitle)
          .maybeSingle()

        if (existingSuggestion) {
          continue
        }

        const { error: suggestionError } = await supabase.from('assignments').insert({
          user_id: body.user_id,
          title: suggestedTitle,
          course_id: courseId,
          due_date: event.due_date,
          source: 'suggested',
        })

        if (!suggestionError) {
          suggestions += 1
        }
      }
    }

    if (body.type === 'gcal') {
      for (const event of vevents) {
        const component = new ICAL.Event(event)
        const title = component.summary?.trim() ?? 'Calendar event'
        const startDate = parseDate(component.startDate)
        const endDate = parseDate(component.endDate)
        const uid = component.uid

        if (!startDate || !endDate || !uid) continue
        if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) continue

        const { data: existingBlock } = await supabase
          .from('calendar_blocks')
          .select('id')
          .eq('user_id', body.user_id)
          .eq('gcal_event_id', uid)
          .maybeSingle()

        const { error } = await supabase.from('calendar_blocks').upsert(
          {
            user_id: body.user_id,
            assignment_id: null,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            source: 'gcal',
            gcal_event_id: uid,
            title,
          },
          { onConflict: 'user_id,gcal_event_id' },
        )

        if (!error) {
          if (existingBlock) {
            updated += 1
          } else {
            inserted += 1
          }
        }
      }
    }

    return new Response(JSON.stringify({ inserted, updated, suggestions }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
