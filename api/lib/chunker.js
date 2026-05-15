'use strict';

const { TRANSFER_PROMPT_RULES } = require('./transfer-detector');
const { RECURRING_PROMPT_RULES } = require('./recurring-detector');
const { extractArray }           = require('./json-extractor');

const CHUNK_SIZE = 100; // data rows sent to Claude per API call

const CATEGORIES = [
  'Loan Payment', 'Materials', 'Repairs', 'Insurance',
  'Utilities', 'Labor', 'Equipment', 'Platform Fees', 'Other',
];

// ── Sensitive-data scrubbing ─────────────────────────────────────────────────

// Column names that should never reach an external AI service
const SENSITIVE_COL_RE = /^(account[\s_-]?(number|num|no|#)?|check[\s_-]?(number|num|no|#)?|card[\s_-]?(number|num|no|#)?|routing[\s_-]?(number|num|no|#)?|aba|ssn|social[\s_-]?security)$/i;

// Card/account number patterns in free text
const INLINE_ACCT_RE = /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4,7}\b|\b\d{13,19}\b/g;

/** Quote-aware CSV field splitter. */
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

/**
 * Removes sensitive columns (by header name) and redacts inline account/card
 * numbers from every data row.
 * @param {string[]} rawLines  All non-empty lines from the uploaded text
 * @returns {{ header: string, lines: string[] }}
 */
function scrubLines(rawLines) {
  if (rawLines.length === 0) return { header: '', lines: [] };

  const headerFields = splitCSV(rawLines[0]);
  const dropIndices = new Set(
    headerFields.map((f, i) => SENSITIVE_COL_RE.test(f.trim()) ? i : -1).filter(i => i >= 0)
  );

  function filterFields(fields) {
    return fields.filter((_, i) => !dropIndices.has(i)).join(',');
  }

  const cleanHeader = filterFields(headerFields);
  const cleanLines  = rawLines.slice(1).map(line => {
    const filtered = filterFields(splitCSV(line));
    return filtered.replace(INLINE_ACCT_RE, '[REDACTED]');
  });

  return { header: cleanHeader, lines: cleanLines };
}

// ── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Scrubs the raw input text and splits data rows into fixed-size chunks.
 * @param {string} text  Raw file content
 * @returns {{ header: string, chunks: string[][] }}
 */
function makeChunks(text) {
  const rawLines = text.split('\n').filter(l => l.trim().length > 0);
  const { header, lines: dataLines } = scrubLines(rawLines);

  const chunks = [];
  if (dataLines.length === 0) {
    chunks.push([]); // single empty chunk — Claude will return []
  } else {
    for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
      chunks.push(dataLines.slice(i, i + CHUNK_SIZE));
    }
  }

  return { header, chunks };
}

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(chunkText) {
  return `You are a financial data parser for a property management application. Parse the data below and extract every transaction record.

Return ONLY a valid JSON array — no markdown, no explanation, no code fences. Each element must have exactly these fields:
- "transaction_date": string, YYYY-MM-DD format
- "description": string, clean payee/merchant name, max 120 chars
- "amount": number — POSITIVE for income/deposits/credits, NEGATIVE for expenses/charges/debits
- "type": "income", "expense", or "transfer"
- "category": exactly one of: ${[...CATEGORIES, 'Income / Rent'].map(c => `"${c}"`).join(', ')}
${RECURRING_PROMPT_RULES}

Rules:
- SKIP header rows, blank rows, total/subtotal rows, balance rows, and any row with no dollar amount
- If separate Debit and Credit columns exist:
    * Credit column has a value → amount: POSITIVE (e.g. Credit=100.00 → amount: 100)
    * Debit column has a value → amount: NEGATIVE (e.g. Debit=50.00 → amount: -50)
    * Set type based on description context — a Zelle/Cash App/Venmo receipt for rent is "income"; a transfer between your own accounts is "transfer"
${TRANSFER_PROMPT_RULES}
- Use "Post Date" as the transaction date when present; otherwise use the first date-like column
- Ignore columns like Status, Balance
- "Income / Rent" category: use for rent payments, rental income, tenant payments
- If a date cannot be determined, use today's date: ${new Date().toISOString().slice(0, 10)}
- Only return the JSON array. Do not include anything else.

Data:
${chunkText}`;
}

// ── Chunk processor ──────────────────────────────────────────────────────────

/**
 * Sends one chunk to Claude and returns the parsed transaction array.
 * Throws on extraction failure; sets err.truncated if output was cut off.
 */
async function processChunk(client, header, chunkLines) {
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

module.exports = { CATEGORIES, CHUNK_SIZE, makeChunks, buildPrompt, processChunk };
