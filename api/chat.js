// Vercel serverless function — proxies Claude chat for Internal Rating Model AI Assistant
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'CLAUDE_API_KEY env var not set' }); return; }

  const { messages } = req.body || {};
  if (!messages || !messages.length) {
    res.status(400).json({ error: 'messages array required' }); return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        system: `You are an expert credit rating analyst AI assistant embedded in an Internal Rating Model tool.
You help analysts with:
- Evaluating creditworthiness of companies and borrowers
- Interpreting financial ratios (leverage, coverage, liquidity, profitability)
- Explaining rating methodologies (e.g. Moody's, S&P, internal models)
- Assessing qualitative factors (management quality, industry outlook, competitive position)
- Drafting rating rationale and justification notes
- Peer group comparisons
- Identifying key rating triggers and sensitivities
- Understanding Basel/RBI guidelines for internal ratings

Be concise, analytical, and use professional credit rating language. Format responses with bullet points or tables where helpful.`,
        messages
      }),
      signal: AbortSignal.timeout(45000)
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data.error?.message || 'Claude API error' }); return;
    }
    const text = data.content?.[0]?.text || '';
    res.status(200).json({ reply: text });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
