import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp } from '@/lib/rateLimit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getUser(request: NextRequest) {
  const supabase = createServiceClient()
  if (!supabase) return { user: null, supabase: null }
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { user: null, supabase }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { user: null, supabase }
  return { user, supabase }
}

export async function GET(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:notes`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ notes: [] })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const notes = (data ?? []).map(n => ({ ...n, text: n.content, tag: n.tags?.[0] }))
  return NextResponse.json({ notes })
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:notes`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { text, content, subject, tag } = body
  const noteContent = content || text
  if (!noteContent) return NextResponse.json({ error: 'text is required' }, { status: 400 })
  if (!subject) return NextResponse.json({ error: 'subject is required' }, { status: 400 })

  const { data } = await supabase.from('notes').insert({
    user_id: user.id,
    title: noteContent.slice(0, 60),
    content: noteContent,
    subject,
    tags: tag ? [tag] : [],
    created_at: new Date().toISOString(),
  }).select().single()

  return NextResponse.json({ note: data ? { ...data, text: data.content, tag: data.tags?.[0] } : null })
}

export async function PUT(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:notes`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { id, text, subject, tag } = body
  const updates: Record<string, unknown> = {}
  if (text !== undefined) { updates.content = text; updates.title = String(text).slice(0, 60) }
  if (subject !== undefined) updates.subject = subject
  if (tag !== undefined) updates.tags = [tag]

  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  return NextResponse.json({ note: { ...data, text: data.content, tag: data.tags?.[0] } })
}

export async function DELETE(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:notes`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { id } = body
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'A valid id is required' }, { status: 400 })

  await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}
