// Vercel serverless function — proxies PDF URLs to avoid CORS, returns base64
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const url = req.query.url;
  if (!url) { res.status(400).json({ error: 'url param required' }); return; }

  try {
    const upstream = await fetch(decodeURIComponent(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CreditAI/1.0)',
        'Accept': 'application/pdf,*/*'
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` }); return;
    }

    const contentType = upstream.headers.get('content-type') || 'application/pdf';
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      res.status(400).json({ error: 'URL does not point to a PDF file' }); return;
    }

    const buffer = await upstream.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    res.status(200).json({ base64, size: buffer.byteLength });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
