import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isRateLimited, getIp, fetchWithRetry } from '@/lib/rateLimit'

export const runtime = 'edge'

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

async function createGithubIssue(title: string, description: string): Promise<number | null> {
  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo  = process.env.GITHUB_REPO
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
  } catch { return null }
}

export async function GET(request: NextRequest) {
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

export async function POST(request: NextRequest) {
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

export async function PUT(request: NextRequest) {
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

export async function DELETE(request: NextRequest) {
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
