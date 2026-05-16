import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { supabase } from '../supabaseClient';
import { CATEGORIES, fmt, inputStyle } from '../utils';

export default function RecurringTab() {
  const { recurring, setRecurring, properties, business, importBatches, runBackfill } = useApp();

  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [recurringForm, setRecurringForm] = useState({ property_id: '', description: '', amount: '', type: 'income', category: '', frequency: 'monthly', day_of_month: 1, next_due_date: '', end_date: '' });
  const [recurFilterProp, setRecurFilterProp] = useState('all');
  const [recurFilterType, setRecurFilterType] = useState('all');
  const [recurFilterFreq, setRecurFilterFreq] = useState('all');
  const [showRecurringBatches, setShowRecurringBatches] = useState(false);

  const displayRecurring = useMemo(() => {
    let rows = [...recurring];
    if (recurFilterProp !== 'all') rows = rows.filter(r => r.property_id === recurFilterProp);
    if (recurFilterType !== 'all') rows = rows.filter(r => r.type === recurFilterType);
    if (recurFilterFreq !== 'all') rows = rows.filter(r => r.frequency === recurFilterFreq);
    return rows;
  }, [recurring, recurFilterProp, recurFilterType, recurFilterFreq]);

  const recurringBatches = useMemo(() => {
    const grouped = {};
    recurring.filter(r => r.batch_id).forEach(r => {
      if (!grouped[r.batch_id]) grouped[r.batch_id] = [];
      grouped[r.batch_id].push(r);
    });
    return Object.entries(grouped).map(([id, items]) => {
      const txBatch = importBatches.find(b => b.id === id);
      return {
        id,
        count: items.length,
        importedAt: txBatch?.importedAt || items[0].created_at || null,
      };
    }).sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''));
  }, [recurring, importBatches]);

  function openAddForm() {
    setEditingRecurring(null);
    setRecurringForm({ property_id: properties[0]?.id || '', description: '', amount: '', type: 'income', category: '', frequency: 'monthly', day_of_month: 1, next_due_date: '', end_date: '' });
    setShowRecurringForm(true);
  }

  function openEditForm(r) {
    setEditingRecurring(r);
    setRecurringForm({ property_id: r.property_id || 'all', description: r.description, amount: Math.abs(r.amount), type: r.type, category: r.category || '', frequency: r.frequency, day_of_month: r.day_of_month, next_due_date: r.next_due_date, end_date: r.end_date || '' });
    setShowRecurringForm(true);
  }

  function closeForm() {
    setShowRecurringForm(false);
    setEditingRecurring(null);
  }

  async function saveRecurring(e) {
    e.preventDefault();
    const payload = {
      business_id: business.id,
      property_id: recurringForm.property_id === 'all' ? null : recurringForm.property_id,
      description: recurringForm.description,
      amount: parseFloat(recurringForm.amount) * (recurringForm.type === 'expense' ? -1 : 1),
      type: recurringForm.type,
      category: recurringForm.category || null,
      frequency: recurringForm.frequency,
      day_of_month: parseInt(recurringForm.day_of_month),
      next_due_date: recurringForm.next_due_date,
      end_date: recurringForm.end_date || null,
      active: true,
    };
    if (editingRecurring) {
      const { data, error } = await supabase.from('recurring_transactions').update(payload).eq('id', editingRecurring.id).select().single();
      if (!error) setRecurring(prev => prev.map(r => r.id === editingRecurring.id ? data : r));
    } else {
      const { data, error } = await supabase.from('recurring_transactions').insert([payload]).select().single();
      if (!error) setRecurring(prev => [...prev, data]);
    }
    closeForm();
    runBackfill();
  }

  function renderForm(keyId) {
    const isEditing = editingRecurring !== null;
    return (
      <form key={keyId} onSubmit={saveRecurring}
        style={{ background: '#0f1117', border: `1px solid ${isEditing ? '#3b82f6' : '#1e2235'}`, borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isEditing && (
          <div style={{ fontSize: 11, color: '#3b82f6', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 4 }}>EDITING RECURRING</div>
        )}
        <select value={recurringForm.property_id} onChange={e => setRecurringForm(v => ({ ...v, property_id: e.target.value }))} style={inputStyle}>
          <option value="all">All Properties (shared expense)</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input placeholder="Description" value={recurringForm.description} onChange={e => setRecurringForm(v => ({ ...v, description: e.target.value }))} required style={inputStyle} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select value={recurringForm.type} onChange={e => setRecurringForm(v => ({ ...v, type: e.target.value }))} style={inputStyle}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input type="number" placeholder="Amount" value={recurringForm.amount} onChange={e => setRecurringForm(v => ({ ...v, amount: e.target.value }))} required style={inputStyle} />
        </div>
        <select value={recurringForm.category} onChange={e => setRecurringForm(v => ({ ...v, category: e.target.value }))} style={inputStyle}>
          <option value="">Income / Rent</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <select value={recurringForm.frequency} onChange={e => setRecurringForm(v => ({ ...v, frequency: e.target.value }))} style={inputStyle}>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input type="number" placeholder="Day of month" min="1" max="31" value={recurringForm.day_of_month} onChange={e => setRecurringForm(v => ({ ...v, day_of_month: e.target.value }))} style={inputStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Start date:</div>
            <input type="date" value={recurringForm.next_due_date} onChange={e => setRecurringForm(v => ({ ...v, next_due_date: e.target.value }))} required style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>End date (optional):</div>
            <input type="date" value={recurringForm.end_date || ''} onChange={e => setRecurringForm(v => ({ ...v, end_date: e.target.value }))} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="submit" style={{ background: '#1d4ed8', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 15, padding: '12px 0', fontWeight: 600 }}>
            {isEditing ? 'Save Changes' : 'Save'}
          </button>
          <button type="button" onClick={closeForm} style={{ background: '#1e2235', border: 'none', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: 15, padding: '12px 0' }}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1 }}>RECURRING TRANSACTIONS</div>
        <button onClick={openAddForm} style={{ background: '#1d4ed8', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          + Add Recurring
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={recurFilterProp} onChange={e => setRecurFilterProp(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 auto', minWidth: 120, fontSize: 13, padding: '8px 10px' }}>
          <option value="all">All Properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={recurFilterType} onChange={e => setRecurFilterType(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 auto', minWidth: 110, fontSize: 13, padding: '8px 10px' }}>
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={recurFilterFreq} onChange={e => setRecurFilterFreq(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 auto', minWidth: 110, fontSize: 13, padding: '8px 10px' }}>
          <option value="all">All Frequencies</option>
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>

      {/* Top form: only when ADDING (not editing — edit form appears inline below) */}
      {showRecurringForm && !editingRecurring && renderForm('add-form')}

      {recurringBatches.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowRecurringBatches(v => !v)}
            style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: showRecurringBatches ? '10px 10px 0 0' : 10, padding: '10px 14px', width: '100%', textAlign: 'left', color: '#94a3b8', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📥 Import Batches ({recurringBatches.length})</span>
            <span style={{ fontSize: 11 }}>{showRecurringBatches ? '▲' : '▼'}</span>
          </button>
          {showRecurringBatches && (
            <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
              {recurringBatches.map(batch => (
                <div key={batch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #1e2235' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{batch.count} recurring schedule{batch.count !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 11, color: '#4b5563' }}>Imported {batch.importedAt ? new Date(batch.importedAt).toLocaleDateString() : 'from file'}</div>
                  </div>
                  <button onClick={async () => {
                    if (!window.confirm(`Delete all ${batch.count} recurring schedule${batch.count !== 1 ? 's' : ''} from this import batch?`)) return;
                    const { error } = await supabase.from('recurring_transactions').delete().eq('batch_id', batch.id);
                    if (!error) setRecurring(prev => prev.filter(r => r.batch_id !== batch.id));
                  }} style={{ background: '#7f1d1d', border: '1px solid #f87171', borderRadius: 8, padding: '7px 12px', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    🗑️ Delete Batch
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {displayRecurring.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: 14, padding: '20px 0' }}>
            {recurring.length === 0 ? 'No recurring transactions set up yet.' : 'No recurring transactions match these filters.'}
          </div>
        )}
        {displayRecurring.map(r => {
          // Inline edit: swap the card for the form when this row is being edited
          if (editingRecurring?.id === r.id) {
            return renderForm(r.id);
          }
          return (
            <div key={r.id} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600, flex: 1, marginRight: 12 }}>{r.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: r.amount >= 0 ? '#4ade80' : '#f87171', whiteSpace: 'nowrap' }}>{fmt(r.amount)}</div>
                  <button onClick={async () => {
                    if (!window.confirm(`Delete "${r.description}" permanently? This cannot be undone.`)) return;
                    const { error } = await supabase.from('recurring_transactions').delete().eq('id', r.id);
                    if (!error) setRecurring(prev => prev.filter(x => x.id !== r.id));
                  }} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, padding: '0 4px' }} title="Delete">✕</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{r.property_id ? properties.find(p => p.id === r.property_id)?.name : 'All Properties'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10, fontFamily: "'Courier New', monospace" }}>
                {r.frequency} · next: {r.next_due_date}{r.end_date ? ` · ends: ${r.end_date}` : ''}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEditForm(r)}
                  style={{ background: '#1e2235', border: '1px solid #2d3555', borderRadius: 8, padding: '6px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                <button onClick={async () => {
                  if (!window.confirm('Stop this recurring transaction? It will no longer generate future entries.')) return;
                  await supabase.from('recurring_transactions').update({ active: false }).eq('id', r.id);
                  setRecurring(prev => prev.filter(x => x.id !== r.id));
                }} style={{ background: '#1e2235', border: '1px solid #7f1d1d', borderRadius: 8, padding: '6px 14px', color: '#f87171', cursor: 'pointer', fontSize: 12 }}>Stop</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
