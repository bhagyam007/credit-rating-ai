// Vercel Edge function — 30s timeout vs 10s for serverless
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'CLAUDE_API_KEY not set' }), { status: 500, headers });

  const { text, company } = await req.json();
  if (!text) return new Response(JSON.stringify({ error: 'text required' }), { status: 400, headers });

  const companyHint = company ? `The company name is: ${company}. ` : '';

  const prompt = `${companyHint}Below is the full extracted text of an annual report. Carefully analyse it and return ONLY a valid JSON object (no markdown, no explanation) with exactly these four keys:

{
  "introduction": "<A 6 to 7 sentence paragraph covering: founder name(s), year of incorporation, registered office state, main business segments, number of manufacturing/production units or plants (state 'Not applicable' if service company), key products or services, and any recent major development.>",
  "timeline": [
    { "year": "<YYYY or YYYY-YY>", "event": "<One concise sentence describing a significant milestone>" }
  ],
  "contingentLiabilities": {
    "summary": "<2-3 sentence narrative overview of the nature, total quantum and any significant items>",
    "items": [
      { "description": "<Nature of contingency>", "amount": "<Amount in INR crore, or 'Not quantified'>", "nature": "<Litigation / Tax / Guarantee / Other>" }
    ]
  },
  "relatedPartyTransactions": {
    "summary": "<2-3 sentence narrative on the overall RPT structure and materiality>",
    "transactions": [
      { "party": "<Party name>", "relationship": "<Subsidiary / Associate / KMP / Promoter entity / etc.>", "nature": "<Purchase / Sale / Loan / Rent / Service / Guarantee / Other>", "amount": "<Amount in INR crore, or 'Not disclosed'>" }
    ]
  }
}

For the timeline: include events from incorporation year to the year of this annual report, in chronological order.
For contingent liabilities and RPTs: include ALL items disclosed in the notes to accounts; do not skip any.
Return ONLY the JSON object.

--- ANNUAL REPORT TEXT ---
${text.slice(0, 180000)}`;

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      stream: true,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!upstream.ok) {
    const err = await upstream.json();
    return new Response(JSON.stringify({ error: err.error?.message || 'Claude API error' }), { status: upstream.status, headers });
  }

  // Pipe the SSE stream straight through to the browser
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  (async () => {
    const reader = upstream.body.getReader();
    let fullText = '';
    let lineBuffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop(); // keep incomplete last line for next chunk
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const evt = JSON.parse(data);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              fullText += evt.delta.text;
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'delta' })}\n\n`));
            }
          } catch {}
        }
      }
      const match = fullText.match(/\{[\s\S]*\}/);
      if (!match) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'No JSON in response' })}\n\n`));
      } else {
        // Send raw text — client parses JSON so special chars don't break server-side stringify
        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done', raw: match[0] })}\n\n`));
      }
    } catch (e) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      ...headers,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    }
  });
}
