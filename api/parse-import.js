'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { CATEGORIES, makeChunks, processChunk } = require('./lib/chunker');

const MAX_BYTES = 512000; // 500 KB hard cap

module.exports = async function handler(req, res) {
  // ── Input validation ───────────────────────────────────────────────────────
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

  // ── Orchestration ──────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { header, chunks } = makeChunks(text);

  try {
    const allTransactions = [];
    let hadError = false;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const txs = await processChunk(client, header, chunks[i]);
        allTransactions.push(...txs);
      } catch (err) {
        hadError = true;
        console.error(`parse-import: chunk ${i + 1}/${chunks.length} failed —`, err.message);
        if (i === 0 && allTransactions.length === 0) {
          const msg = err.truncated
            ? 'Import partially processed — try a smaller date range for complete results.'
            : 'AI returned an unexpected format. Please try again.';
          return res.status(500).json({ error: msg });
        }
      }
    }

    // ── Sanitise output ──────────────────────────────────────────────────────
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
      ...(hadError && { warning: 'Some rows could not be parsed and were skipped.' }),
    });
  } catch (err) {
    console.error('parse-import error:', err.message);
    return res.status(500).json({ error: 'AI parsing failed. Please try again.' });
  }
};
