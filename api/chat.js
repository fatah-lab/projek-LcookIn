export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Baca body dengan berbagai cara
    let body = req.body;

    // Kalau body masih string, parse manual
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    // Kalau masih kosong, baca raw stream
    if (!body || typeof body !== 'object') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      try { body = JSON.parse(raw); } catch(e) {
        return res.status(400).json({ error: 'Body tidak bisa diparsing', raw });
      }
    }

    const messages = body?.messages;
    const system = body?.system;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages tidak valid', body });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key belum diset di Environment Variables' });
    }

    const payload = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages,
    };
    if (system) payload.system = system;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message, detail: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}