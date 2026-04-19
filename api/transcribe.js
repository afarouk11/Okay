export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return res.status(503).json({ error: 'Transcription service not configured' });

  // Read raw body from stream
  const rawBody = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  }).catch(() => null);

  if (!rawBody || rawBody.length === 0)
    return res.status(400).json({ error: 'No audio data received' });

  const rawCt = req.headers['content-type'] || 'audio/webm';
  const contentType = rawCt.split(';')[0].trim();

  let result;
  try {
    const r = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
      {
        method: 'POST',
        headers: { Authorization: `Token ${key}`, 'Content-Type': contentType },
        body: rawBody,
      }
    );
    if (!r.ok) {
      const text = await r.text();
      if (text.includes('did not match the expected pattern'))
        return res.status(r.status).json({ error: 'Unsupported audio format — try a different browser or microphone' });
      return res.status(r.status).json({ error: text });
    }
    result = await r.json();
  } catch {
    return res.status(503).json({ error: 'Transcription service unavailable' });
  }

  const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  if (!transcript)
    return res.status(422).json({ error: 'Could not transcribe audio' });

  return res.status(200).json({ transcript });
}
