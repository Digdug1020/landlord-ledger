const Anthropic = require('@anthropic-ai/sdk');

const CATEGORIES = [
  "Loan Payment", "Materials", "Repairs", "Insurance",
  "Utilities", "Labor", "Equipment", "Platform Fees", "Other",
];

const MAX_INPUT_CHARS = 400000; // ~100k tokens — well within Haiku's context

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text } = req.body;
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'No data provided.' });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: 'File is too large. Split it into smaller files and import each separately.' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI parsing is not configured on this server.' });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a financial data parser for a property management application. Parse the data below and extract every transaction record.

Return ONLY a valid JSON array — no markdown, no explanation, no code fences. Each element must have exactly these fields:
- "transaction_date": string, YYYY-MM-DD format
- "description": string, clean payee/merchant name, max 120 chars
- "amount": number — POSITIVE for income/deposits/credits, NEGATIVE for expenses/charges/debits
- "type": "income" or "expense"
- "category": exactly one of: ${[...CATEGORIES, 'Income / Rent'].map(c => `"${c}"`).join(', ')}
- "recurring": boolean — true if this looks like a repeating charge (insurance, mortgage, utilities, subscriptions, etc.)

Rules:
- SKIP header rows, blank rows, total/subtotal rows, balance rows, and any row with no dollar amount
- Infer income vs expense from context: deposits, rent received, credits → income (positive); payments, charges, fees → expense (negative)
- "Income / Rent" category: use for rent payments, rental income, tenant payments
- If a date cannot be determined, use today's date: ${new Date().toISOString().slice(0, 10)}
- Only return the JSON array. Do not include anything else.

Data:
${text}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim();

    // Try multiple strategies to extract a JSON array from the model response.
    // Claude occasionally adds explanation text, code fences, or wraps the
    // array in an object — handle all of these gracefully.
    function extractArray(text) {
      // 1. Bare valid JSON
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && Array.isArray(parsed.transactions)) return parsed.transactions;
      } catch {}

      // 2. Slice from first [ to last ] to strip surrounding prose / fences
      const aStart = text.indexOf('[');
      const aEnd   = text.lastIndexOf(']');
      if (aStart !== -1 && aEnd > aStart) {
        try {
          const parsed = JSON.parse(text.slice(aStart, aEnd + 1));
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }

      // 3. Slice from first { to last } (model wrapped in an object)
      const oStart = text.indexOf('{');
      const oEnd   = text.lastIndexOf('}');
      if (oStart !== -1 && oEnd > oStart) {
        try {
          const parsed = JSON.parse(text.slice(oStart, oEnd + 1));
          if (Array.isArray(parsed)) return parsed;
          if (parsed && Array.isArray(parsed.transactions)) return parsed.transactions;
        } catch {}
      }

      return null;
    }

    const transactions = extractArray(raw);
    if (!transactions) {
      console.error('parse-import: all extraction strategies failed. Raw response (800 chars):', raw.slice(0, 800));
      return res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
    }

    // Sanitise each row so bad AI output doesn't reach the client
    const clean = transactions.map(t => ({
      transaction_date: typeof t.transaction_date === 'string' ? t.transaction_date : new Date().toISOString().slice(0, 10),
      description:      String(t.description || '').slice(0, 120),
      amount:           Number(t.amount) || 0,
      type:             t.type === 'income' ? 'income' : 'expense',
      category:         [...CATEGORIES, 'Income / Rent'].includes(t.category) ? t.category : 'Other',
      recurring:        Boolean(t.recurring),
    })).filter(t => t.amount !== 0); // drop zero-amount rows

    return res.status(200).json({ transactions: clean });
  } catch (err) {
    console.error('parse-import error:', err.message);
    return res.status(500).json({ error: 'AI parsing failed. Please try again.' });
  }
};
