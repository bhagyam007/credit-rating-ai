// Vercel serverless function — analyses annual report PDF via Claude API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'CLAUDE_API_KEY env var not set on server' }); return; }

  const { base64, company } = req.body || {};
  if (!base64) { res.status(400).json({ error: 'base64 PDF required' }); return; }

  const companyHint = company ? `The company name is: ${company}. ` : '';

  const prompt = `${companyHint}Carefully analyse this annual report and return ONLY a valid JSON object (no markdown, no explanation) with exactly these four keys:

{
  "introduction": "<A 6 to 7 sentence paragraph covering: founder name(s), year of incorporation, registered office state, main business segments, number of manufacturing/production units or plants (state 'Not applicable' if service company), key products or services, and any recent major development.>",

  "timeline": [
    { "year": "<YYYY or YYYY-YY>", "event": "<One concise sentence describing a significant milestone — IPO, major acquisition, capacity expansion, product launch, regulatory event, rating change, debt restructuring, etc.>" }
  ],

  "contingentLiabilities": {
    "summary": "<2-3 sentence narrative overview of the nature, total quantum and any significant items>",
    "items": [
      {
        "description": "<Nature of contingency — tax demand, legal case, guarantee, etc.>",
        "amount": "<Amount in INR crore, or 'Not quantified'>",
        "nature": "<Litigation / Tax / Guarantee / Other>"
      }
    ]
  },

  "relatedPartyTransactions": {
    "summary": "<2-3 sentence narrative on the overall RPT structure and materiality>",
    "transactions": [
      {
        "party": "<Party name>",
        "relationship": "<Subsidiary / Associate / KMP / Promoter entity / etc.>",
        "nature": "<Purchase / Sale / Loan / Rent / Service / Guarantee / Other>",
        "amount": "<Amount in INR crore for the year, or 'Not disclosed'>"
      }
    ]
  }
}

For the timeline: include events from incorporation year to the year of this annual report, in chronological order.
For contingent liabilities and RPTs: include ALL items disclosed in the notes to accounts; do not skip any.
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
        model: 'claude-opus-4-6',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 }
            },
            { type: 'text', text: prompt }
          ]
        }]
      }),
      signal: AbortSignal.timeout(180000)
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data.error?.message || 'Claude API error' }); return;
    }

    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) { res.status(500).json({ error: 'Claude did not return valid JSON', raw: text.slice(0, 500) }); return; }

    res.status(200).json({ result: JSON.parse(match[0]) });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
