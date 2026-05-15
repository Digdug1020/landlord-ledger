import { useState } from 'react';
import { useApp } from '../AppContext';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PROPERTY_TYPES, fmt, printProperty, typeColor, inputStyle } from '../utils';

export default function PropertiesTab() {
  const { transactions, properties, setProperties, business } = useApp();

  const [showPropEditor, setShowPropEditor] = useState(false);
  const [editingProp, setEditingProp] = useState(null);
  const [propForm, setPropForm] = useState({ name: '', address: '', property_type: 'Residential', note: '', archived: false });

  const propStats = properties.map(prop => {
    const txs = transactions.filter(t => t.property_id === prop.id);
    const income = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { ...prop, income, expenses, net: income - expenses, txCount: txs.length };
  });

  function openAddProperty() {
    setEditingProp(null);
    setPropForm({ name: '', address: '', property_type: 'Residential', note: '', archived: false });
    setShowPropEditor(true);
  }

  function openEditProperty(prop) {
    setEditingProp(prop);
    setPropForm({ name: prop.name, address: prop.address || '', property_type: prop.property_type || 'Residential', note: prop.note || '', archived: prop.archived || false });
    setShowPropEditor(true);
  }

  async function saveProperty(e) {
    e.preventDefault();
    if (editingProp) {
      const { data, error } = await supabase.from('properties').update({
        name: propForm.name, address: propForm.address, property_type: propForm.property_type, note: propForm.note, archived: propForm.archived,
      }).eq('id', editingProp.id).select().single();
      if (error) { alert('Error saving property.'); return; }
      setProperties(prev => propForm.archived ? prev.filter(p => p.id !== editingProp.id) : prev.map(p => p.id === editingProp.id ? data : p));
    } else {
      const { data, error } = await supabase.from('properties').insert([{
        business_id: business.id, name: propForm.name, address: propForm.address,
        property_type: propForm.property_type, note: propForm.note, archived: false,
      }]).select().single();
      if (error) { alert('Error adding property.'); return; }
      setProperties(prev => [...prev, data]);
    }
    setShowPropEditor(false);
  }

  function exportPropertyPDF(p) {
    const txs = transactions.filter(t => t.property_id === p.id);
    const income = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const net = income - expenses;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
    doc.setFillColor(15, 17, 23);
    doc.rect(0, 0, 216, 28, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const landlordW = doc.getTextWidth('Landlord');
    doc.text('Landlord', 14, 18);
    doc.setTextColor(59, 130, 246);
    doc.text('Ledger', 14 + landlordW, 18);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(15);
    doc.text(p.name, 14, 42);
    const meta = [p.address, p.property_type].filter(Boolean).join('  |  ');
    if (meta) { doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100); doc.text(meta, 14, 49); }
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.4);
    doc.line(14, 54, 202, 54);
    autoTable(doc, {
      startY: 58,
      head: [['Date', 'Description', 'Category', 'Amount']],
      body: txs.length ? txs.map(t => [t.transaction_date, t.description || '', t.category || '—', fmt(t.amount)]) : [['—', 'No transactions', '', '']],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 34, 53], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { halign: 'right' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    const sy = doc.lastAutoTable.finalY + 8;
    doc.setFillColor(239, 246, 255);
    doc.rect(14, sy, 188, 30, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('Total Income', 20, sy + 9);
    doc.setTextColor(22, 163, 74);
    doc.text(fmt(income), 200, sy + 9, { align: 'right' });
    doc.setTextColor(60, 60, 60);
    doc.text('Total Expenses', 20, sy + 17);
    doc.setTextColor(220, 38, 38);
    doc.text(fmt(expenses), 200, sy + 17, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Net P&L', 20, sy + 25);
    doc.setTextColor(...(net >= 0 ? [22, 163, 74] : [220, 38, 38]));
    doc.text(fmt(net), 200, sy + 25, { align: 'right' });
    doc.save(`LandlordLedger-${p.name.replace(/[^a-z0-9]/gi, '-')}.pdf`);
  }

  function exportPropertyCSV(p) {
    const txs = transactions.filter(t => t.property_id === p.id);
    const header = 'Date,Description,Category,Amount,Type\n';
    const rows = txs.map(t => [
      t.transaction_date,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.amount,
      t.amount >= 0 ? 'Income' : 'Expense',
    ].join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LandlordLedger-${p.name.replace(/[^a-z0-9]/gi, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1 }}>MANAGE PROPERTIES</div>
        <button onClick={openAddProperty} style={{ background: '#1d4ed8', border: 'none', borderRadius: 10, padding: '10px 16px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>+ Add Property</button>
      </div>

      {showPropEditor && (
        <form onSubmit={saveProperty} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 14, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>{editingProp ? 'Edit Property' : 'Add New Property'}</div>
          <input placeholder="Property name or address" value={propForm.name} onChange={e => setPropForm(v => ({ ...v, name: e.target.value }))} required style={inputStyle} />
          <input placeholder="City, State" value={propForm.address} onChange={e => setPropForm(v => ({ ...v, address: e.target.value }))} style={inputStyle} />
          <select value={propForm.property_type} onChange={e => setPropForm(v => ({ ...v, property_type: e.target.value }))} style={inputStyle}>
            {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <input placeholder="Note (optional)" value={propForm.note} onChange={e => setPropForm(v => ({ ...v, note: e.target.value }))} style={inputStyle} />
          {editingProp && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f87171', fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={propForm.archived} onChange={e => setPropForm(v => ({ ...v, archived: e.target.checked }))} />
              Archive this property (hide from app)
            </label>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="submit" style={{ background: '#1d4ed8', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 15, padding: '12px 0', fontWeight: 600 }}>Save</button>
            <button type="button" onClick={() => setShowPropEditor(false)} style={{ background: '#1e2235', border: 'none', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: 15, padding: '12px 0' }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {propStats.map(p => {
          const tc = typeColor(p.property_type);
          return (
            <div key={p.id} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 14, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{p.address}</div>
                  <span style={{ background: tc.bg, color: tc.text, fontSize: 11, padding: '3px 10px', borderRadius: 6, fontFamily: "'Courier New', monospace" }}>{p.property_type}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <button onClick={() => openEditProperty(p)} style={{ background: '#1e2235', border: '1px solid #2d3555', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                  <button onClick={() => printProperty(p, transactions)} style={{ background: '#1a3a2a', border: '1px solid #14532d', borderRadius: 8, padding: '6px 12px', color: '#4ade80', cursor: 'pointer', fontSize: 12 }}>🖨️ Print</button>
                  <button onClick={() => exportPropertyPDF(p)} style={{ background: '#1e2235', border: '1px solid #2d3555', borderRadius: 8, padding: '6px 12px', color: '#93c5fd', cursor: 'pointer', fontSize: 12 }}>📄 PDF</button>
                  <button onClick={() => exportPropertyCSV(p)} style={{ background: '#1e2235', border: '1px solid #2d3555', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>📥 CSV</button>
                </div>
              </div>
              {p.note && <div style={{ fontSize: 12, color: '#94a3b8', borderTop: '1px solid #1e2235', paddingTop: 8, marginTop: 6 }}>{p.note}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}
