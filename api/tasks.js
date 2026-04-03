import { createClient } from '@supabase/supabase-js';
import { applyHeaders, isRateLimited, getIp, fetchWithRetry } from './_lib.js';

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Creates a GitHub Issue for the given task and returns the issue number,
 * or null when the GitHub credentials are not configured or the request fails.
 */
async function createGithubIssue(title, description) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo  = process.env.GITHUB_REPO;
  if (!token || !owner || !repo) return null;

  try {
    const response = await fetchWithRetry(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, body: description || '' }),
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.number ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  applyHeaders(res, 'POST, GET, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = getIp(req);
  if (isRateLimited(`${ip}:tasks`, 60, 60_000)) {
    return res.status(429).json({ error: 'Too many requests — please try again later' });
  }

  if (!supabase) {
    // Demo mode: tasks stored client-side only
    if (req.method === 'GET') return res.status(200).json({ tasks: [] });
    return res.status(200).json({ success: true, task: req.body || {} });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return res.status(200).json({ tasks: data || [] });
  }

  if (req.method === 'POST') {
    const { title, description, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const issueNumber = await createGithubIssue(title, description);

    const { data, error: insertErr } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        due_date: due_date || null,
        done: false,
        github_issue_number: issueNumber,
      })
      .select()
      .single();

    if (insertErr) return res.status(500).json({ error: insertErr.message });
    return res.status(200).json({ task: data });
  }

  if (req.method === 'PUT') {
    const { id, title, description, due_date, done } = req.body;
    if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: 'A valid id is required' });

    const updates = {};
    if (title !== undefined)       updates.title       = title;
    if (description !== undefined) updates.description = description;
    if (due_date !== undefined)    updates.due_date    = due_date;
    if (done !== undefined)        updates.done        = done;

    const { data, error: updateErr } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateErr) return res.status(400).json({ error: updateErr.message });
    if (!data) return res.status(404).json({ error: 'Task not found' });
    return res.status(200).json({ task: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: 'A valid id is required' });
    await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
