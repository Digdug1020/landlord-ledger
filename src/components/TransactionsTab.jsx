import { useState, useMemo } from 'react';
import { useApp } from '../AppContext';
import { supabase } from '../supabaseClient';
import { CATEGORIES, fmt, printProperty, inputStyle } from '../utils';

export default function TransactionsTab() {
  const { transactions, setTransactions, properties, filterProp, setFilterProp, business, importBatches } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTx, setNewTx] = useState({ property_id: properties[0]?.id || '', transaction_date: '', description: '', category: '', amount: '', type: 'income' });
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [txSort, setTxSort] = useState('date-desc');
  const [txFilterType, setTxFilterType] = useState('all');
  const [txFilterCat, setTxFilterCat] = useState('all');
  const [showImportBatches, setShowImportBatches] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null);
  const [editForm, setEditForm] = useState({ property_id: '', transaction_date: '', description: '', category: '', amount: '', type: 'income' });

  const displayTxs = useMemo(() => {
    let rows = filterProp === 'all' ? [...transactions] : transactions.filter(t => t.property_id === filterProp);
    if (txFilterType !== 'all') rows = rows.filter(t => t.type === txFilterType);
    if (txFilterCat !== 'all') rows = rows.filter(t => (t.category || '') === txFilterCat);
    if (txSort === 'date-desc') rows.reverse();
    else if (txSort === 'amount-desc') rows.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    else if (txSort === 'amount-asc') rows.sort((a, b) => Math.abs(a.amount) - Math.abs(b.amount));
    return rows;
  }, [transactions, filterProp, txSort, txFilterType, txFilterCat]);

  async function deleteTransaction(id) {
    if (!window.confirm('Delete this transaction?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions(prev => prev.filter(t => t.id !== id));
    else alert('Error deleting.');
  }

  function startEdit(tx) {
    setEditingTxId(tx.id);
    setEditForm({
      property_id: tx.property_id || 'all',
      transaction_date: tx.transaction_date,
      description: tx.description || '',
      category: tx.category || '',
      amount: Math.abs(tx.amount),
      type: tx.amount >= 0 ? 'income' : 'expense',
    });
  }

  async function saveEdit(originalTx) {
    const amount = parseFloat(editForm.amount) * (editForm.type === 'expense' ? -1 : 1);
    const { data, error } = await supabase.from('transactions').update({
      property_id: editForm.property_id === 'all' ? null : editForm.property_id,
      transaction_date: editForm.transaction_date,
      description: editForm.description,
      category: editForm.category || null,
      amount,
      type: editForm.type,
    }).eq('id', originalTx.id).select().single();
    if (error) { alert('Error saving: ' + error.message); return; }
    setTransactions(prev => prev.map(t => t.id === originalTx.id ? data : t));
    setEditingTxId(null);
  }

  async function submitManual(e) {
    e.preventDefault();
    const amount = parseFloat(newTx.amount) * (newTx.type === 'expense' ? -1 : 1);
    const { data, error } = await supabase.from('transactions').insert([{
      business_id: business.id,
      property_id: newTx.property_id === 'all' ? null : newTx.property_id,
      transaction_date: newTx.transaction_date,
      description: newTx.description,
      category: newTx.category || null,
      amount,
      type: newTx.type,
      source: 'manual',
    }]).select().single();
    if (error) { console.error(error); alert('Error saving.'); return; }
    setTransactions(prev => [...prev, data]);
    setNewTx(v => ({ ...v, transaction_date: '', description: '', category: '', amount: '', type: 'income' }));
    setShowAddForm(false);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10 }}>
        <select value={filterProp} onChange={e => setFilterProp(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          <option value="all">All properties</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button onClick={() => setShowAddForm(v => !v)} style={{ background: '#1d4ed8', border: 'none', borderRadius: 10, padding: '12px 16px', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap' }}>+ Add</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={txSort} onChange={e => setTxSort(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 auto', minWidth: 120, fontSize: 13, padding: '8px 10px' }}>
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="amount-desc">Largest First</option>
          <option value="amount-asc">Smallest First</option>
        </select>
        <select value={txFilterType} onChange={e => setTxFilterType(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 auto', minWidth: 100, fontSize: 13, padding: '8px 10px' }}>
          <option value="all">All Types</option>
          <option value="income">Income Only</option>
          <option value="expense">Expenses Only</option>
        </select>
        <select value={txFilterCat} onChange={e => setTxFilterCat(e.target.value)}
          style={{ ...inputStyle, flex: '1 1 auto', minWidth: 130, fontSize: 13, padding: '8px 10px' }}>
          <option value="all">All Categories</option>
          <option value="Income / Rent">Income / Rent</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filterProp !== 'all' && (
        <button onClick={() => { const prop = properties.find(p => p.id === filterProp); if (prop) printProperty(prop, transactions); }}
          style={{ width: '100%', marginBottom: 12, background: '#1a3a2a', border: '1px solid #14532d', borderRadius: 10, padding: '10px 0', color: '#4ade80', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          🖨️ Print / Export This Property
        </button>
      )}

      {displayTxs.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => setSelectedTxIds(selectedTxIds.length === displayTxs.length ? [] : displayTxs.map(t => t.id))}
            style={{ background: '#1e2235', border: '1px solid #2d3555', borderRadius: 8, padding: '8px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
            {selectedTxIds.length === displayTxs.length ? 'Deselect All' : 'Select All'}
          </button>
          {selectedTxIds.length > 0 && (
            <button onClick={async () => {
              if (!window.confirm(`Delete ${selectedTxIds.length} transaction(s)?`)) return;
              const { error } = await supabase.from('transactions').delete().in('id', selectedTxIds);
              if (!error) { setTransactions(prev => prev.filter(t => !selectedTxIds.includes(t.id))); setSelectedTxIds([]); }
            }} style={{ background: '#7f1d1d', border: '1px solid #f87171', borderRadius: 8, padding: '8px 14px', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              🗑️ Delete {selectedTxIds.length} Selected
            </button>
          )}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={submitManual} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 14, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select value={newTx.property_id} onChange={e => setNewTx(v => ({ ...v, property_id: e.target.value }))} style={inputStyle}>
            <option value="all">All Properties (shared expense)</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name} — {p.address}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input type="date" value={newTx.transaction_date} onChange={e => setNewTx(v => ({ ...v, transaction_date: e.target.value }))} required style={inputStyle} />
            <select value={newTx.type} onChange={e => setNewTx(v => ({ ...v, type: e.target.value }))} style={inputStyle}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <input placeholder="Description" value={newTx.description} onChange={e => setNewTx(v => ({ ...v, description: e.target.value }))} required style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <select value={newTx.category} onChange={e => setNewTx(v => ({ ...v, category: e.target.value }))} style={inputStyle}>
              <option value="">Income / Rent</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Amount" value={newTx.amount} onChange={e => setNewTx(v => ({ ...v, amount: e.target.value }))} required style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="submit" style={{ background: '#1d4ed8', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 15, padding: '12px 0', fontWeight: 600 }}>Save</button>
            <button type="button" onClick={() => setShowAddForm(false)} style={{ background: '#1e2235', border: 'none', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: 15, padding: '12px 0' }}>Cancel</button>
          </div>
        </form>
      )}

      {importBatches.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowImportBatches(v => !v)}
            style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: showImportBatches ? '10px 10px 0 0' : 10, padding: '10px 14px', width: '100%', textAlign: 'left', color: '#94a3b8', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📥 Import Batches ({importBatches.length})</span>
            <span style={{ fontSize: 11 }}>{showImportBatches ? '▲' : '▼'}</span>
          </button>
          {showImportBatches && (
            <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderTop: 'none', borderRadius: '0 0 10px 10px' }}>
              {importBatches.map(batch => (
                <div key={batch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #1e2235' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{batch.count} transaction{batch.count !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{batch.dateRange.from} → {batch.dateRange.to}</div>
                    <div style={{ fontSize: 11, color: '#4b5563' }}>Imported {new Date(batch.importedAt).toLocaleDateString()}</div>
                  </div>
                  <button onClick={async () => {
                    if (!window.confirm(`Delete all ${batch.count} transactions from this import batch?`)) return;
                    const { error } = await supabase.from('transactions').delete().eq('batch_id', batch.id);
                    if (!error) setTransactions(prev => prev.filter(t => t.batch_id !== batch.id));
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
        {displayTxs.map(tx => {
          if (editingTxId === tx.id) {
            return (
              <form key={tx.id} onSubmit={e => { e.preventDefault(); saveEdit(tx); }}
                style={{ background: '#0f1117', border: '1px solid #3b82f6', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: '#3b82f6', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 4 }}>EDITING TRANSACTION</div>
                <select value={editForm.property_id} onChange={e => setEditForm(v => ({ ...v, property_id: e.target.value }))} style={inputStyle}>
                  <option value="all">All Properties (shared expense)</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name} — {p.address}</option>)}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input type="date" value={editForm.transaction_date} onChange={e => setEditForm(v => ({ ...v, transaction_date: e.target.value }))} required style={inputStyle} />
                  <select value={editForm.type} onChange={e => setEditForm(v => ({ ...v, type: e.target.value }))} style={inputStyle}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <input placeholder="Description" value={editForm.description} onChange={e => setEditForm(v => ({ ...v, description: e.target.value }))} required style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <select value={editForm.category} onChange={e => setEditForm(v => ({ ...v, category: e.target.value }))} style={inputStyle}>
                    <option value="">Income / Rent</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input type="number" placeholder="Amount" value={editForm.amount} onChange={e => setEditForm(v => ({ ...v, amount: e.target.value }))} required style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button type="submit" style={{ background: '#1d4ed8', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 15, padding: '12px 0', fontWeight: 600 }}>Save Changes</button>
                  <button type="button" onClick={() => setEditingTxId(null)} style={{ background: '#1e2235', border: 'none', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: 15, padding: '12px 0' }}>Cancel</button>
                </div>
              </form>
            );
          }
          const isSelected = selectedTxIds.includes(tx.id);
          return (
            <div key={tx.id} onClick={() => setSelectedTxIds(prev => isSelected ? prev.filter(id => id !== tx.id) : [...prev, tx.id])}
              style={{ background: isSelected ? '#1a2540' : '#0f1117', border: `1px solid ${isSelected ? '#3b82f6' : '#1e2235'}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? '#3b82f6' : '#2d3555'}`, background: isSelected ? '#3b82f6' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600 }}>{tx.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: tx.amount >= 0 ? '#4ade80' : '#f87171', whiteSpace: 'nowrap' }}>{fmt(tx.amount)}</div>
                  <button onClick={e => { e.stopPropagation(); startEdit(tx); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: '0 4px' }} title="Edit">✏️</button>
                  <button onClick={e => { e.stopPropagation(); deleteTransaction(tx.id); }} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, padding: '0 4px' }} title="Delete">✕</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, paddingLeft: 28 }}>
                {tx.property_id ? (properties.find(p => p.id === tx.property_id)?.name || 'Unknown') : 'Shared / All Properties'}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingLeft: 28 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace" }}>{tx.transaction_date}</span>
                {tx.category && <span style={{ fontSize: 11, color: '#94a3b8' }}>{tx.category}</span>}
              </div>
            </div>
          );
        })}
        {displayTxs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: 14 }}>
            {transactions.length === 0 ? 'No transactions yet.' : 'No transactions match these filters.'}
          </div>
        )}
      </div>
    </>
  );
}
