// Local server — serves annual-report.html and calls Claude CLI for analysis
// Usage: node local-server.js
// Then open: http://localhost:3333/annual-report

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3333;
const CLAUDE_BIN = 'C:\\Users\\User\\.vscode\\extensions\\anthropic.claude-code-2.1.96-win32-x64\\resources\\native-binary\\claude.exe';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Serve annual-report.html
  if (req.method === 'GET' && (req.url === '/annual-report' || req.url === '/annual-report.html' || req.url === '/')) {
    const file = path.join(__dirname, 'annual-report.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('annual-report.html not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Analyse endpoint
  if (req.method === 'POST' && req.url === '/api/analyse') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let text, company;
      try {
        ({ text, company } = JSON.parse(body));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
      }

      if (!text) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'text required' }));
        return;
      }

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

      console.log(`[${new Date().toLocaleTimeString()}] Sending to Claude CLI...`);

      const claude = spawn(CLAUDE_BIN, ['-p', prompt], {
        timeout: 180000
      });

      let output = '';
      let errOutput = '';

      claude.stdout.on('data', d => { output += d.toString(); });
      claude.stderr.on('data', d => { errOutput += d.toString(); });

      claude.on('close', code => {
        if (code !== 0) {
          console.error('Claude CLI error:', errOutput);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: errOutput || 'Claude CLI exited with code ' + code }));
          return;
        }

        const match = output.match(/\{[\s\S]*\}/);
        if (!match) {
          console.error('No JSON in response:', output.slice(0, 300));
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No JSON found in Claude response' }));
          return;
        }

        try {
          const result = JSON.parse(match[0]);
          console.log(`[${new Date().toLocaleTimeString()}] Done.`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result }));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to parse Claude response: ' + e.message }));
        }
      });

      claude.on('error', err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Could not start Claude CLI: ' + err.message }));
      });
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`\n✓ Annual Report Analyser running at http://localhost:${PORT}/annual-report\n`);
});
