if (req.method === 'GET') {
  const { data } = await supabase.from('notes').select('id, text, subject').eq('user_id', user.id).order('created_at', { ascending: false });
  return res.status(200).json({ notes: data || [] });
}

if (req.method === 'POST') {
  const { text, subject, tag } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  if (!subject) return res.status(400).json({ error: 'subject is required' });
  const { data } = await supabase.from('notes').insert({
    user_id: user.id,
    text,
    subject,
    tag,
    created_at: new Date().toISOString()
  }).select('id, text, subject').single();
  return res.status(200).json({ note: data });
}