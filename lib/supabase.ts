import { createClient } from '@supabase/supabase-js'

// Server-side client (service role) — full DB access, never expose to browser
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  } catch (err) {
    console.error('Failed to create Supabase service client:', err)
    return null
  }
}

// Client-side Supabase (anon key) — safe for browser
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key)
  } catch (err) {
    console.error('Failed to create Supabase browser client:', err)
    return null
  }
}

export type Profile = {
  id: string
  email: string
  name: string | null
  plan: 'student' | 'homeschool'
  year: string | null
  subject: string
  board: string
  target: string | null
  xp: number
  level: number
  is_admin: boolean
  trial_messages_today: number
  trial_messages_reset_date: string | null
  adhd_mode: boolean
  dyslexia_mode: boolean
  dyscalculia_mode: boolean
  created_at: string
  updated_at: string
}

export type ChatMessage = {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  topic: string | null
  created_at: string
}

export type Mistake = {
  id: string
  user_id: string
  topic: string
  subtopic: string | null
  mistake_type: string
  details: string | null
  logged_at: string
}

export type DailyPlan = {
  id: string
  user_id: string
  date: string
  tasks: PlanTask[]
  created_at: string
}

export type PlanTask = {
  id: string
  topic: string
  task: string
  done: boolean
  priority: 'high' | 'medium' | 'low'
}
