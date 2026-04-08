// Vercel serverless function — streams Claude response to avoid Hobby plan timeout
export const config = {
  api: { bodyParser: { sizeLimit: '50mb' } }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'CLAUDE_API_KEY not set on server' }); return; }

  const { base64, company } = req.body || {};
  if (!base64) { res.status(400).json({ error: 'base64 PDF required' }); return; }

  const companyHint = company ? `The company name is: ${company}. ` : '';

  const prompt = `${companyHint}Carefully analyse this annual report and return ONLY a valid JSON object (no markdown, no explanation) with exactly these four keys:

{
  "introduction": "<A 6 to 7 sentence paragraph covering: founder name(s), year of incorporation, registered office state, main business segments, number of manufacturing/production units or plants (state 'Not applicable' if service company), key products or services, and any recent major development.>",
  "timeline": [
    { "year": "<YYYY or YYYY-YY>", "event": "<One concise sentence describing a significant milestone>" }
  ],
  "contingentLiabilities": {
    "summary": "<2-3 sentence narrative overview>",
    "items": [
      { "description": "<Nature of contingency>", "amount": "<Amount in INR crore, or 'Not quantified'>", "nature": "<Litigation / Tax / Guarantee / Other>" }
    ]
  },
  "relatedPartyTransactions": {
    "summary": "<2-3 sentence narrative on RPT structure and materiality>",
    "transactions": [
      { "party": "<Party name>", "relationship": "<Subsidiary / Associate / KMP / Promoter entity / etc.>", "nature": "<Purchase / Sale / Loan / Rent / Service / Guarantee / Other>", "amount": "<Amount in INR crore, or 'Not disclosed'>" }
    ]
  }
}

For the timeline: include events from incorporation year to the year of this annual report, in chronological order.
For contingent liabilities and RPTs: include ALL items disclosed in the notes to accounts.
Return ONLY the JSON object.`;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        stream: true,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!upstream.ok) {
      const err = await upstream.json();
      res.status(upstream.status).json({ error: err.error?.message || 'Claude API error' });
      return;
    }

    // Stream response — keeps connection alive, bypasses Hobby timeout
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const evt = JSON.parse(data);
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            fullText += evt.delta.text;
            // Send heartbeat so connection stays alive
            res.write(`data: ${JSON.stringify({ type: 'delta', text: evt.delta.text })}\n\n`);
          }
        } catch {}
      }
    }

    // Extract and send final JSON
    const match = fullText.match(/\{[\s\S]*\}/);
    if (!match) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'No JSON in response' })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'done', result: JSON.parse(match[0]) })}\n\n`);
    }
    res.end();

  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
