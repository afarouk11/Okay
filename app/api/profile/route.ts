import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

async function getUser(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return { user: null, supabase: null }
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { user: null, supabase }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null, supabase }
  return { user, supabase }
}

// GET — fetch current user's profile
export async function GET(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:profile`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, plan, year, board, target, xp, level, adhd_mode, dyslexia_mode, dyscalculia_mode, created_at')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

// PATCH — update editable profile fields
export async function PATCH(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:profile`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  // Only allow updates to safe fields; ignore everything else
  const allowed = ['name', 'year', 'board', 'target', 'adhd_mode', 'dyslexia_mode', 'dyscalculia_mode'] as const
  type AllowedKey = typeof allowed[number]
  const updates: Partial<Record<AllowedKey, unknown>> = {}

  for (const key of allowed) {
    if (key in body) {
      const val = body[key]
      if (key === 'adhd_mode' || key === 'dyslexia_mode' || key === 'dyscalculia_mode') {
        if (typeof val === 'boolean') updates[key] = val
      } else {
        if (typeof val === 'string') updates[key] = val.slice(0, 200)
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select('id, name, email, plan, year, board, target, xp, level, adhd_mode, dyslexia_mode, dyscalculia_mode')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
