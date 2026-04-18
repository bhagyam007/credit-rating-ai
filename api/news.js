// Vercel serverless function — proxies Google News RSS to avoid CORS
// Supports: ?company=X  (company news, always India-scoped)
//           ?industry=X&geo=india|global  (industry trending topics)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const company  = req.query.company  || '';
  const industry = req.query.industry || '';
  const geo      = req.query.geo || 'india'; // 'india' or 'global'

  if (!company && !industry) {
    res.status(400).json({ error: 'company or industry param required' });
    return;
  }

  let queryStr, rssUrl;
  if (company) {
    // Company news — always India-scoped
    queryStr = encodeURIComponent(company + ' India');
    rssUrl   = `https://news.google.com/rss/search?q=${queryStr}&hl=en-IN&gl=IN&ceid=IN:en`;
  } else {
    // Industry trending topics
    queryStr = encodeURIComponent(industry + ' industry');
    rssUrl   = geo === 'global'
      ? `https://news.google.com/rss/search?q=${queryStr}&hl=en&gl=US&ceid=US:en`
      : `https://news.google.com/rss/search?q=${encodeURIComponent(industry + ' industry India')}&hl=en-IN&gl=IN&ceid=IN:en`;
  }

  try {
    const upstream = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CreditAI/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      signal: AbortSignal.timeout(12000)
    });
    const text = await upstream.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(text);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
