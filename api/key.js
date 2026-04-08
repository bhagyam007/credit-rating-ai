// Returns the Claude API key to the client so the browser can call Anthropic directly
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'API key not configured' }); return; }

  res.status(200).json({ key: apiKey });
}
