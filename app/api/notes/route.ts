import { NextRequest, NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp, fetchWithRetry } from '@/lib/rateLimit'

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

function getResource(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  return (searchParams.get('resource') || 'notes').toLowerCase()
}

async function createGithubIssue(title: string, description: string): Promise<number | null> {
  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  if (!token || !owner || !repo) return null
  try {
    const res = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body: description || '' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.number ?? null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const resource = getResource(request)
  if (resource === 'memory') return handleMemoryGet(request)
  if (resource === 'tasks') return handleTasksGet(request)
  if (resource === 'notes') return handleNotesGet(request)
  return NextResponse.json({ error: 'Unknown notes resource' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const resource = getResource(request)
  if (resource === 'memory') return handleMemoryPost(request)
  if (resource === 'tasks') return handleTasksPost(request)
  if (resource === 'notes') return handleNotesPost(request)
  return NextResponse.json({ error: 'Unknown notes resource' }, { status: 400 })
}

export async function PUT(request: NextRequest) {
  const resource = getResource(request)
  if (resource === 'tasks') return handleTasksPut(request)
  if (resource === 'notes') return handleNotesPut(request)
  return NextResponse.json({ error: 'Unknown notes resource' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const resource = getResource(request)
  if (resource === 'memory') return handleMemoryDelete(request)
  if (resource === 'tasks') return handleTasksDelete(request)
  if (resource === 'notes') return handleNotesDelete(request)
  return NextResponse.json({ error: 'Unknown notes resource' }, { status: 400 })
}

async function handleNotesGet(request: NextRequest) {
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

async function handleNotesPost(request: NextRequest) {
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

async function handleNotesPut(request: NextRequest) {
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
  if (text !== undefined) {
    updates.content = text
    updates.title = String(text).slice(0, 60)
  }
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

async function handleNotesDelete(request: NextRequest) {
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

async function handleMemoryGet(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:memory`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ memories: [] })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('jarvis_memory')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ memories: data ?? [] })
}

async function handleMemoryPost(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:memory`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { type, content, topic } = body
  if (!type || !content) return NextResponse.json({ error: 'type and content required' }, { status: 400 })

  await supabase.from('jarvis_memory').upsert({
    user_id: user.id,
    type,
    content,
    topic: topic || null,
    created_at: new Date().toISOString(),
  }, { onConflict: 'user_id,type' })

  return NextResponse.json({ success: true })
}

async function handleMemoryDelete(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:memory`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('jarvis_memory').delete().eq('user_id', user.id)
  return NextResponse.json({ success: true })
}

async function handleTasksGet(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:tasks`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ tasks: [] })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  return NextResponse.json({ tasks: data ?? [] })
}

async function handleTasksPost(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:tasks`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { title, description, due_date } = body
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const issueNumber = await createGithubIssue(title, description ?? '')
  const { data, error } = await supabase.from('tasks').insert({
    user_id: user.id,
    title,
    description: description || null,
    due_date: due_date || null,
    done: false,
    github_issue_number: issueNumber,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

async function handleTasksPut(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:tasks`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { id, title, description, due_date, done } = body
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'A valid id is required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (title !== undefined) updates.title = title
  if (description !== undefined) updates.description = description
  if (due_date !== undefined) updates.due_date = due_date
  if (done !== undefined) updates.done = done

  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  return NextResponse.json({ task: data })
}

async function handleTasksDelete(request: NextRequest) {
  const ip = getIp(request)
  if (isRateLimited(`${ip}:tasks`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const { user, supabase } = await getUser(request)
  if (!supabase) return NextResponse.json({ success: true })
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { id } = body
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'A valid id is required' }, { status: 400 })

  await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}
