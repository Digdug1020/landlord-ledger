const Anthropic = require('@anthropic-ai/sdk');

const CATEGORIES = [
  "Loan Payment", "Materials", "Repairs", "Insurance",
  "Utilities", "Labor", "Equipment", "Platform Fees", "Other",
];

const MAX_BYTES  = 512000; // 500 KB hard cap
const CHUNK_SIZE = 100;    // lines sent to Claude per request

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'No data provided.' });
  }
  if (text.length > MAX_BYTES) {
    return res.status(400).json({
      error: 'This file is too large. Try uploading 1–2 months at a time to keep processing fast and costs low.',
    });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI parsing is not configured on this server.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ── Sensitive data scrubbing ───────────────────────────────────────────────
  // Column names that should never be sent to an external AI service
  const SENSITIVE_COL_RE = /^(account[\s_-]?(number|num|no|#)?|check[\s_-]?(number|num|no|#)?|card[\s_-]?(number|num|no|#)?|routing[\s_-]?(number|num|no|#)?|aba|ssn|social[\s_-]?security)$/i;

  // Card/account number patterns in free text: "xxxx-xxxx-xxxx-xxxx" or
  // bare 13-19 digit sequences (avoids matching short amounts/dates)
  const INLINE_ACCT_RE = /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4,7}\b|\b\d{13,19}\b/g;

  // Minimal CSV field splitter (respects double-quoted fields)
  function splitCSV(line) {
    const fields = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { fields.push(cur); cur = ''; }
      else { cur += ch; }
    }
    fields.push(cur);
    return fields;
  }

  function scrubLines(rawLines) {
    if (rawLines.length === 0) return { header: '', lines: [] };

    const headerFields = splitCSV(rawLines[0]);
    // Find which column indices are sensitive
    const dropIndices = new Set(
      headerFields.map((f, i) => SENSITIVE_COL_RE.test(f.trim()) ? i : -1).filter(i => i >= 0)
    );

    function filterFields(fields) {
      return fields.filter((_, i) => !dropIndices.has(i)).join(',');
    }

    const cleanHeader = filterFields(headerFields);
    const cleanLines  = rawLines.slice(1).map(line => {
      const filtered = filterFields(splitCSV(line));
      // Belt-and-suspenders: redact inline account/card number patterns
      return filtered.replace(INLINE_ACCT_RE, '[REDACTED]');
    });

    return { header: cleanHeader, lines: cleanLines };
  }
  // ── End scrubbing ──────────────────────────────────────────────────────────

  const rawLines          = text.split('\n').filter(l => l.trim().length > 0);
  const { header, lines: dataLines } = scrubLines(rawLines);

  // Split data rows into CHUNK_SIZE chunks
  const chunks = [];
  if (dataLines.length === 0) {
    chunks.push([]); // single empty chunk — Claude will return []
  } else {
    for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
      chunks.push(dataLines.slice(i, i + CHUNK_SIZE));
    }
  }

  function buildPrompt(chunkText) {
    return `You are a financial data parser for a property management application. Parse the data below and extract every transaction record.

Return ONLY a valid JSON array — no markdown, no explanation, no code fences. Each element must have exactly these fields:
- "transaction_date": string, YYYY-MM-DD format
- "description": string, clean payee/merchant name, max 120 chars
- "amount": number — POSITIVE for income/deposits/credits, NEGATIVE for expenses/charges/debits
- "type": "income", "expense", or "transfer"
- "category": exactly one of: ${[...CATEGORIES, 'Income / Rent'].map(c => `"${c}"`).join(', ')}
- "recurring": boolean — true if this looks like a repeating charge (insurance, mortgage, utilities, subscriptions, etc.)

Rules:
- SKIP header rows, blank rows, total/subtotal rows, balance rows, and any row with no dollar amount
- If separate Debit and Credit columns exist:
    * Credit column has a value → amount: POSITIVE (e.g. Credit=100.00 → amount: 100)
    * Debit column has a value → amount: NEGATIVE (e.g. Debit=50.00 → amount: -50)
    * Set type based on description context — a Zelle/Cash App/Venmo receipt for rent is "income"; a transfer between your own accounts is "transfer"
- Use type "transfer" for internal account movements that are NOT real income or spending:
    * Description contains (case-insensitive): transfer, zelle, cash app, venmo, paypal, ach transfer, wire transfer, mobile deposit, account transfer, between accounts
    * EXCEPTION: if description also contains a person's name or words like "rent", "deposit from", "payment from" — use "income" instead; it is a legitimate rent payment received
- Use type "income" for real earnings: rent received, service fees, interest earned, refunds
- Use type "expense" for real spending: repairs, utilities, insurance, loan payments, purchases
- Use "Post Date" as the transaction date when present; otherwise use the first date-like column
- Ignore columns like Status, Balance
- "Income / Rent" category: use for rent payments, rental income, tenant payments
- If a date cannot be determined, use today's date: ${new Date().toISOString().slice(0, 10)}
- Only return the JSON array. Do not include anything else.

Data:
${chunkText}`;
  }

  // Extract a JSON array from Claude's response using multiple strategies
  function extractArray(t) {
    // 1. Bare valid JSON
    try {
      const p = JSON.parse(t);
      if (Array.isArray(p)) return p;
      if (p && Array.isArray(p.transactions)) return p.transactions;
    } catch {}

    // 2. Slice from first [ to last ]
    const aStart = t.indexOf('[');
    const aEnd   = t.lastIndexOf(']');
    if (aStart !== -1 && aEnd > aStart) {
      try {
        const p = JSON.parse(t.slice(aStart, aEnd + 1));
        if (Array.isArray(p)) return p;
      } catch {}
    }

    // 3. Slice from first { to last } (model wrapped in an object)
    const oStart = t.indexOf('{');
    const oEnd   = t.lastIndexOf('}');
    if (oStart !== -1 && oEnd > oStart) {
      try {
        const p = JSON.parse(t.slice(oStart, oEnd + 1));
        if (Array.isArray(p)) return p;
        if (p && Array.isArray(p.transactions)) return p.transactions;
      } catch {}
    }

    return null;
  }

  async function processChunk(chunkLines) {
    const chunkText = [header, ...chunkLines].join('\n');
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: buildPrompt(chunkText) }],
    });

    const wasTruncated = message.stop_reason === 'max_tokens';

    const raw = message.content[0].text
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const result = extractArray(raw);
    if (!result) {
      console.error('parse-import chunk failed. stop_reason:', message.stop_reason, '| raw (800):', raw.slice(0, 800));
      throw Object.assign(new Error('extraction failed'), { truncated: wasTruncated });
    }
    return result;
  }

  try {
    const allTransactions = [];
    let hadError = false;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const txs = await processChunk(chunks[i]);
        allTransactions.push(...txs);
      } catch (err) {
        hadError = true;
        console.error(`parse-import: chunk ${i + 1}/${chunks.length} failed —`, err.message);
        // If the very first chunk fails with nothing collected, surface an error
        if (i === 0 && allTransactions.length === 0) {
          const msg = err.truncated
            ? 'Import partially processed — try a smaller date range for complete results.'
            : 'AI returned an unexpected format. Please try again.';
          return res.status(500).json({ error: msg });
        }
        // Otherwise skip the failed chunk and continue with what we have
      }
    }

    // Sanitise all collected rows
    const clean = allTransactions.map(t => ({
      transaction_date: typeof t.transaction_date === 'string' ? t.transaction_date : new Date().toISOString().slice(0, 10),
      description:      String(t.description || '').slice(0, 120),
      amount:           Number(t.amount) || 0,
      type:             ['income', 'expense', 'transfer'].includes(t.type) ? t.type : 'expense',
      category:         [...CATEGORIES, 'Income / Rent'].includes(t.category) ? t.category : 'Other',
      recurring:        Boolean(t.recurring),
    })).filter(t => t.amount !== 0);

    return res.status(200).json({
      transactions: clean,
      // Let the client know if some chunks were skipped
      ...(hadError && { warning: 'Some rows could not be parsed and were skipped.' }),
    });
  } catch (err) {
    console.error('parse-import error:', err.message);
    return res.status(500).json({ error: 'AI parsing failed. Please try again.' });
  }
};
