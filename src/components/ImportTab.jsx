import { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { inputStyle } from '../utils';

const CATEGORIES = ['Loan Payment', 'Materials', 'Repairs', 'Insurance', 'Utilities', 'Labor', 'Equipment', 'Platform Fees', 'Other'];

export default function ImportTab() {
  const { transactions, setTransactions, properties, business, subscription, recurring, setRecurring, setActiveTab, setFilterProp } = useApp();

  const [importStep, setImportStep] = useState('upload');
  const [importRows, setImportRows] = useState([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importDoneCount, setImportDoneCount] = useState(0);
  const [importPasteText, setImportPasteText] = useState('');
  const [importDragging, setImportDragging] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importDuplicates, setImportDuplicates] = useState([]);
  const importDropRef = useRef(null);

  useEffect(() => {
    if (importStep === 'duplicates' && importDuplicates.length === 0) {
      setImportStep('done');
    }
  }, [importStep, importDuplicates]);

  const isPro = subscription?.status === 'pro';
  const existingImported = transactions.filter(t => t.source === 'import').length;
  const FREE_LIMIT = 50;
  const PRO_WARN_LIMIT = 300;

  const thisMonthImported = (() => {
    if (!isPro) return 0;
    const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
    return transactions.filter(t => t.source === 'import' && new Date(t.created_at) >= start).length;
  })();

  const activeImportRows = importRows.filter(r => !r._deleted);
  const wouldExceedFree = !isPro && (existingImported + activeImportRows.length) > FREE_LIMIT;
  const proMonthWarning = isPro && thisMonthImported + activeImportRows.length > PRO_WARN_LIMIT;

  function resetImport() {
    setImportStep('upload');
    setImportRows([]);
    setImportError(null);
    setImportDoneCount(0);
    setImportParsing(false);
    setImportPasteText('');
    setImportDragging(false);
    setImportFileName('');
    setImportDuplicates([]);
  }

  function updateRow(id, field, value) {
    setImportRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
  }

  function includeTransfer(id) {
    setImportRows(prev => prev.map(r => r._id === id
      ? { ...r, _deleted: false, type: r.amount >= 0 ? 'income' : 'expense' }
      : r));
  }

  function excludeTransfer(id) {
    setImportRows(prev => prev.map(r => r._id === id ? { ...r, _deleted: true } : r));
  }

  async function runParse(text) {
    setImportParsing(true);
    setImportError(null);
    try {
      const res = await fetch('/api/parse-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setImportError(data.error || 'Parsing failed.'); setImportParsing(false); return; }
      if (data.warning) setImportError(data.warning);

      let rows = data.transactions.map((t, i) => ({
        ...t,
        _id: i,
        _transfer: t.type === 'transfer',
        _deleted: t.type === 'transfer',
        property_id: '',
        isDuplicate: transactions.some(ex =>
          ex.transaction_date === t.transaction_date &&
          Math.abs(Number(ex.amount)) === Math.abs(t.amount) &&
          (ex.description || '').toLowerCase() === (t.description || '').toLowerCase()
        ),
      }));

      const descMap = {};
      [...transactions, ...rows].forEach(t => {
        const key = (t.description || '').toLowerCase().trim();
        if (!descMap[key]) descMap[key] = [];
        descMap[key].push(t);
      });
      rows = rows.map(r => {
        if (r._transfer || r.recurring) return r;
        const key = (r.description || '').toLowerCase().trim();
        const group = descMap[key] || [];
        if (group.length < 2) return r;
        const months = new Set(group.map(t => (t.transaction_date || '').slice(0, 7)).filter(Boolean));
        if (months.size < 2) return r;
        const days = group.map(t => {
          const d = new Date((t.transaction_date || '') + 'T12:00:00');
          return isNaN(d) ? -1 : d.getDate();
        }).filter(d => d >= 1);
        const avgDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
        if (days.every(d => Math.abs(d - avgDay) <= 5)) {
          return { ...r, recurring: true, guessedFrequency: 'monthly' };
        }
        return r;
      });

      setImportRows(rows);
      setImportStep('preview');
    } catch (e) {
      setImportError('Network error. Please try again.');
    } finally {
      setImportParsing(false);
    }
  }

  async function handleParseFile(file) {
    setImportError(null);
    setImportParsing(true);
    setImportStep('upload');
    setImportFileName(file.name);
    try {
      let text = '';
      if (file.name.match(/\.xlsx?$/i)) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(ws);
      } else {
        text = await file.text();
      }
      await runParse(text);
    } catch (e) {
      setImportError('Could not read file: ' + e.message);
      setImportParsing(false);
    }
  }

  async function handleConfirmImport() {
    if (wouldExceedFree) return;
    const batchId = crypto.randomUUID();
    const toInsert = importRows
      .filter(r => !r._deleted)
      .map(r => ({
        business_id: business.id,
        property_id: r.property_id || null,
        transaction_date: r.transaction_date,
        description: r.description,
        category: r.category,
        amount: (r.type === 'expense' || (r.type === 'transfer' && r.amount < 0)) ? -Math.abs(r.amount) : Math.abs(r.amount),
        type: r.type === 'transfer' ? (r.amount > 0 ? 'income' : 'expense') : r.type,
        source: 'import',
        batch_id: batchId,
      }));
    if (toInsert.length === 0) return;

    const { data: inserted, error } = await supabase.from('transactions').insert(toInsert).select();
    if (error) { setImportError('Import failed: ' + error.message); return; }

    const prevTransactions = transactions;
    setTransactions(prev => [...prev, ...inserted]);

    const activeRows = importRows.filter(r => !r._deleted);
    const recurringRows = activeRows.filter(r => r.recurring);
    if (recurringRows.length > 0) {
      const seen = new Set();
      const recurringTemplates = recurringRows
        .filter(r => {
          const key = (r.description || '').toLowerCase().trim() + '|' + (r.guessedFrequency || 'monthly');
          if (seen.has(key)) return false;
          seen.add(key); return true;
        })
        .map(r => {
          const resolvedType = r.type === 'transfer' ? (r.amount > 0 ? 'income' : 'expense') : r.type;
          const resolvedAmt = resolvedType === 'expense' ? -Math.abs(r.amount) : Math.abs(r.amount);
          const freq = r.guessedFrequency || 'monthly';
          const base = new Date(r.transaction_date + 'T12:00:00');
          const dom = base.getDate();
          const next = new Date(base);
          if (freq === 'monthly') next.setMonth(next.getMonth() + 1);
          else if (freq === 'weekly') next.setDate(next.getDate() + 7);
          else next.setFullYear(next.getFullYear() + 1);
          const today = new Date();
          if (freq === 'monthly') { while (next <= today) next.setMonth(next.getMonth() + 1); }
          else if (freq === 'weekly') { while (next <= today) next.setDate(next.getDate() + 7); }
          else { while (next <= today) next.setFullYear(next.getFullYear() + 1); }
          return {
            business_id: business.id,
            property_id: r.property_id || null,
            description: r.description,
            amount: resolvedAmt,
            type: resolvedType,
            category: r.category || null,
            frequency: freq,
            day_of_month: dom,
            next_due_date: next.toISOString().slice(0, 10),
            active: true,
            batch_id: batchId,
          };
        });

      let { error: rErr } = await supabase.from('recurring_transactions').insert(recurringTemplates);
      if (rErr && rErr.message && rErr.message.includes('batch_id')) {
        const withoutBatch = recurringTemplates.map(({ batch_id, ...rest }) => rest);
        const { error: rErr2 } = await supabase.from('recurring_transactions').insert(withoutBatch);
        if (rErr2) console.error('Recurring insert failed:', rErr2.message);
      } else if (rErr) {
        console.error('Recurring insert failed:', rErr.message);
      }

      const { data: freshRecur } = await supabase.from('recurring_transactions')
        .select('*').eq('business_id', business.id).eq('active', true).order('next_due_date');
      if (freshRecur) setRecurring(freshRecur);
    }

    setImportDoneCount(inserted.length);

    const dupes = [];
    (inserted || []).forEach(newTx => {
      prevTransactions.forEach(ex => {
        const sameDate = ex.transaction_date === newTx.transaction_date;
        const sameDesc = (ex.description || '').toLowerCase().trim() === (newTx.description || '').toLowerCase().trim();
        const sameCat  = (ex.category || '') === (newTx.category || '');
        const amtClose = Math.abs(Math.abs(ex.amount) - Math.abs(newTx.amount)) <= 5;
        const daysDiff = Math.abs(
          new Date(ex.transaction_date + 'T12:00:00') - new Date(newTx.transaction_date + 'T12:00:00')
        ) / (1000 * 60 * 60 * 24);
        const isDupe = (sameDate && amtClose) || (sameDate && sameDesc) || (sameDesc && sameCat && daysDiff <= 3);
        if (isDupe && !dupes.some(d => d.existing.id === ex.id && d.imported.id === newTx.id)) {
          dupes.push({ existing: ex, imported: newTx });
        }
      });
    });

    if (dupes.length > 0) {
      setImportDuplicates(dupes);
      setImportStep('duplicates');
    } else {
      setImportStep('done');
    }
  }

  function fmt(n) {
    return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (importStep === 'duplicates') return (
    <div>
      {importParsing && <AIOverlay />}
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 16 }}>REVIEW POSSIBLE DUPLICATES</div>
      <div style={{ background: '#1c1200', border: '1px solid #d97706', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#d97706', lineHeight: 1.6 }}>
        ⚠️ {importDuplicates.length} possible duplicate{importDuplicates.length !== 1 ? 's' : ''} found — same date + similar amount, same date + same payee, or same payee + category within 3 days of an existing record. Choose what to keep for each one.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {importDuplicates.map(({ existing, imported }, idx) => (
          <div key={idx} style={{ background: '#0f1117', border: '1px solid #d97706', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ background: '#080b12', border: '1px solid #1e2235', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 6, fontFamily: "'Courier New', monospace", letterSpacing: 1 }}>EXISTING</div>
                <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600, marginBottom: 4, wordBreak: 'break-word' }}>{existing.description}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: existing.amount >= 0 ? '#4ade80' : '#f87171' }}>{fmt(existing.amount)}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{existing.transaction_date}</div>
              </div>
              <div style={{ background: '#080b12', border: '1px solid #1e3a5f', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, color: '#1d4ed8', marginBottom: 6, fontFamily: "'Courier New', monospace", letterSpacing: 1 }}>JUST IMPORTED</div>
                <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600, marginBottom: 4, wordBreak: 'break-word' }}>{imported.description}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: imported.amount >= 0 ? '#4ade80' : '#f87171' }}>{fmt(imported.amount)}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{imported.transaction_date}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <button onClick={() => setImportDuplicates(prev => prev.filter((_, i) => i !== idx))}
                style={{ background: '#1a3a2a', border: '1px solid #14532d', borderRadius: 8, padding: '9px 0', color: '#4ade80', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Keep Both
              </button>
              <button onClick={async () => {
                await supabase.from('transactions').delete().eq('id', imported.id);
                setTransactions(prev => prev.filter(t => t.id !== imported.id));
                setImportDuplicates(prev => prev.filter((_, i) => i !== idx));
              }} style={{ background: '#1a1535', border: '1px solid #7c3aed', borderRadius: 8, padding: '9px 0', color: '#c4b5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Delete Import
              </button>
              <button onClick={async () => {
                await supabase.from('transactions').delete().eq('id', existing.id);
                setTransactions(prev => prev.filter(t => t.id !== existing.id));
                setImportDuplicates(prev => prev.filter((_, i) => i !== idx));
              }} style={{ background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 8, padding: '9px 0', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                Delete Original
              </button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => { setImportDuplicates([]); setImportStep('done'); }}
        style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#1e2235', color: '#94a3b8', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
        Skip All & Continue →
      </button>
    </div>
  );

  if (importStep === 'done') return (
    <div>
      {importParsing && <AIOverlay />}
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>
          {importDoneCount} transaction{importDoneCount !== 1 ? 's' : ''} imported
        </div>
        <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 32 }}>They're now in your Transactions tab.</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => { resetImport(); setFilterProp('all'); setActiveTab('transactions'); }}
            style={{ background: '#1d4ed8', border: 'none', borderRadius: 10, padding: '12px 24px', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
            View Transactions
          </button>
          <button onClick={resetImport}
            style={{ background: '#1e2235', border: '1px solid #2d3555', borderRadius: 10, padding: '12px 24px', color: '#94a3b8', cursor: 'pointer', fontSize: 15 }}>
            Import More
          </button>
        </div>
      </div>
    </div>
  );

  if (importStep === 'preview') return (
    <div>
      {importParsing && <AIOverlay />}
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 16 }}>IMPORT — REVIEW TRANSACTIONS</div>

      {wouldExceedFree && (
        <div style={{ background: '#2d1515', border: '1px solid #f87171', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 6 }}>Import limit reached</div>
          <div style={{ fontSize: 13, color: '#fca5a5' }}>
            This import is too large for your free trial. You've used {existingImported} of {FREE_LIMIT} total imported transactions.
            This file would add {activeImportRows.length} more. Try a smaller file or{' '}
            <span onClick={() => setActiveTab('billing')} style={{ color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}>subscribe for full access</span>.
          </div>
        </div>
      )}

      {proMonthWarning && (
        <div style={{ background: '#1a1a2e', border: '1px solid #a78bfa', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#c4b5fd' }}>
            ⚠️ Large import ({activeImportRows.length} transactions). For best results, consider splitting into smaller date ranges.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 14, color: '#e2e8f0' }}>
          <span style={{ fontWeight: 700, color: '#4ade80' }}>{activeImportRows.length}</span> transactions parsed
          {!isPro && <span style={{ color: '#94a3b8', fontSize: 12 }}> · {existingImported} of {FREE_LIMIT} free slots used</span>}
        </div>
        <button onClick={resetImport}
          style={{ background: 'transparent', border: '1px solid #2d3555', borderRadius: 8, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          ← Start Over
        </button>
      </div>

      {importError && (
        <div style={{ background: '#2d1515', border: '1px solid #f87171', borderRadius: 10, padding: 12, marginBottom: 14, color: '#f87171', fontSize: 13 }}>{importError}</div>
      )}

      {importRows.some(r => r._transfer) && (() => {
        const transferRows = importRows.filter(r => r._transfer);
        const includedCount = transferRows.filter(r => !r._deleted).length;
        return (
          <div style={{ background: '#1c1200', border: '1px solid #d97706', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
              ⚠️ {transferRows.length} Possible Transfer{transferRows.length !== 1 ? 's' : ''} Detected
            </div>
            <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6, marginBottom: 14 }}>
              These look like transfers between accounts — not income or expenses. Importing them would inflate your totals. They're excluded by default. Check any that represent real income or spending.
              {includedCount > 0 && <span style={{ color: '#d97706' }}> ({includedCount} included — will be saved as income or expense based on amount.)</span>}
            </div>
            {transferRows.map(row => (
              <div key={row._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #2a1d00' }}>
                <input type="checkbox" checked={!row._deleted}
                  onChange={e => e.target.checked ? includeTransfer(row._id) : excludeTransfer(row._id)}
                  style={{ width: 18, height: 18, flexShrink: 0, cursor: 'pointer', accentColor: '#d97706' }} />
                <div style={{ flex: 1, opacity: row._deleted ? 0.4 : 1 }}>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{row.description}</div>
                  <div style={{ fontSize: 11, color: '#92400e' }}>
                    {row.transaction_date} · <span style={{ color: row.amount >= 0 ? '#4ade80' : '#f87171' }}>{row.amount >= 0 ? '+' : ''}{fmt(row.amount)}</span>
                  </div>
                </div>
                {!row._deleted && (
                  <select value={row.type === 'transfer' ? (row.amount >= 0 ? 'income' : 'expense') : row.type}
                    onChange={e => updateRow(row._id, 'type', e.target.value)}
                    style={{ ...inputStyle, fontSize: 12, padding: '6px 8px', width: 'auto' }}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        );
      })()}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {importRows.filter(r => !r._deleted && !r._transfer).map(row => (
          <div key={row._id} style={{ background: '#0f1117', border: `1px solid ${row.isDuplicate ? '#854d0e' : '#1e2235'}`, borderRadius: 12, padding: 14 }}>
            {row.isDuplicate && (
              <div style={{ fontSize: 11, color: '#fbbf24', fontFamily: "'Courier New', monospace", marginBottom: 8 }}>⚠ POSSIBLE DUPLICATE</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 10px', borderRadius: 8, background: row.recurring ? '#1a1535' : '#0f1117', border: `1px solid ${row.recurring ? '#7c3aed' : '#1e2235'}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                <input type="checkbox" checked={!!row.recurring}
                  onChange={e => updateRow(row._id, 'recurring', e.target.checked)}
                  style={{ accentColor: '#a78bfa', cursor: 'pointer', width: 17, height: 17, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: row.recurring ? 600 : 400, color: row.recurring ? '#c4b5fd' : '#64748b' }}>
                  ↻ Recurring{row.recurring ? ' — will add to schedule' : ''}
                </span>
              </label>
              {row.recurring && (
                <select value={row.guessedFrequency || 'monthly'}
                  onChange={e => updateRow(row._id, 'guessedFrequency', e.target.value)}
                  style={{ ...inputStyle, fontSize: 12, padding: '4px 8px', width: 'auto', flexShrink: 0 }}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input type="date" value={row.transaction_date}
                onChange={e => updateRow(row._id, 'transaction_date', e.target.value)}
                style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }} />
              <select value={row.type} onChange={e => updateRow(row._id, 'type', e.target.value)}
                style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <input value={row.description} onChange={e => updateRow(row._id, 'description', e.target.value)}
              placeholder="Description" style={{ ...inputStyle, fontSize: 13, padding: '8px 10px', marginBottom: 8 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input type="number" value={Math.abs(row.amount)}
                onChange={e => updateRow(row._id, 'amount', Number(e.target.value))}
                placeholder="Amount" style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }} />
              <select value={row.category} onChange={e => updateRow(row._id, 'category', e.target.value)}
                style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }}>
                <option value="Income / Rent">Income / Rent</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
              <select value={row.property_id} onChange={e => updateRow(row._id, 'property_id', e.target.value)}
                style={{ ...inputStyle, fontSize: 13, padding: '8px 10px' }}>
                <option value="">Shared / All Properties</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={() => updateRow(row._id, '_deleted', true)}
                style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18, padding: '0 6px' }} title="Remove row">✕</button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleConfirmImport} disabled={wouldExceedFree || activeImportRows.length === 0}
        style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: wouldExceedFree || activeImportRows.length === 0 ? '#1e2235' : '#1d4ed8',
          color: wouldExceedFree || activeImportRows.length === 0 ? '#4b5563' : '#fff',
          fontSize: 16, fontWeight: 700, cursor: wouldExceedFree || activeImportRows.length === 0 ? 'not-allowed' : 'pointer' }}>
        Import {activeImportRows.length} Transaction{activeImportRows.length !== 1 ? 's' : ''}
      </button>
    </div>
  );

  return (
    <div>
      {importParsing && <AIOverlay />}
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 16 }}>IMPORT TRANSACTIONS</div>

      {!isPro && (
        <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#94a3b8' }}>
          Free trial: <span style={{ color: existingImported >= FREE_LIMIT ? '#f87171' : '#4ade80', fontWeight: 600 }}>{existingImported}</span> of {FREE_LIMIT} imported transactions used.
          {existingImported >= FREE_LIMIT && <> <span onClick={() => setActiveTab('billing')} style={{ color: '#3b82f6', cursor: 'pointer' }}>Upgrade for unlimited →</span></>}
        </div>
      )}

      <div
        ref={importDropRef}
        onDragOver={e => { e.preventDefault(); setImportDragging(true); }}
        onDragLeave={() => setImportDragging(false)}
        onDrop={e => { e.preventDefault(); setImportDragging(false); const f = e.dataTransfer.files[0]; if (f) handleParseFile(f); }}
        onClick={() => document.getElementById('importFileInput').click()}
        style={{ border: `2px dashed ${importDragging ? '#3b82f6' : '#2d3555'}`, borderRadius: 14, padding: '32px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: importDragging ? '#0d1b3e' : '#0f1117', transition: 'border-color 0.15s, background 0.15s' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
        <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>Drag & drop a file, or click to browse</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>CSV · XLSX · XLS</div>
        <input id="importFileInput" type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files[0]; if (f) handleParseFile(f); e.target.value = ''; }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: '#1e2235' }} />
        <div style={{ fontSize: 12, color: '#4b5563', fontFamily: "'Courier New', monospace" }}>OR PASTE TEXT</div>
        <div style={{ flex: 1, height: 1, background: '#1e2235' }} />
      </div>

      <textarea value={importPasteText} onChange={e => setImportPasteText(e.target.value)}
        placeholder="Paste CSV data, bank export, or any tab/comma separated text here…"
        rows={6} style={{ ...inputStyle, resize: 'vertical', fontSize: 13, fontFamily: "'Courier New', monospace", marginBottom: 12 }} />

      {importError && (
        <div style={{ background: '#2d1515', border: '1px solid #f87171', borderRadius: 10, padding: 12, marginBottom: 12, color: '#f87171', fontSize: 13 }}>{importError}</div>
      )}

      <button
        onClick={() => { if (importPasteText.trim()) runParse(importPasteText); }}
        disabled={importParsing || !importPasteText.trim()}
        style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
          background: importParsing || !importPasteText.trim() ? '#1e2235' : '#1d4ed8',
          color: importParsing || !importPasteText.trim() ? '#4b5563' : '#fff',
          fontSize: 16, fontWeight: 700, cursor: importParsing || !importPasteText.trim() ? 'not-allowed' : 'pointer',
          marginBottom: 20 }}>
        {importParsing ? 'Parsing with AI…' : 'Parse with AI →'}
      </button>

      <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>About imports</div>
        CSV and Excel files are sent to Claude AI for parsing. Your data is used only to extract transaction records and is not stored by Anthropic beyond the request.
        Review all transactions carefully before confirming — AI parsing may occasionally misread amounts, dates, or categories.
        Large files (&gt;1,000 rows) may take 10–30 seconds to parse.
        {!isPro && <> Free trial accounts are limited to {FREE_LIMIT} total imported transactions.</>}
      </div>
    </div>
  );
}

function AIOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(8,11,18,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all' }}>
      <div style={{ background: '#0f1117', border: '1px solid #2d3555', borderRadius: 18, padding: '36px 32px', maxWidth: 340, width: '90%', textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #1e2235', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>Processing your file with AI…</div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>This may take 30–60 seconds.<br />Please do not close this page or upload another file.</div>
      </div>
    </div>
  );
}
