import { useState } from 'react';
import { useApp } from '../AppContext';
import { fmt, typeColor } from '../utils';

export default function DashboardTab() {
  const { transactions, properties, setActiveTab } = useApp();
  const [dashYear, setDashYear] = useState(String(new Date().getFullYear()));
  const [dashQuarter, setDashQuarter] = useState('all');

  const dashYears = [...new Set(transactions.map(t => t.transaction_date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const nowYear = String(new Date().getFullYear());
  if (!dashYears.includes(nowYear)) dashYears.unshift(nowYear);

  const dashTxs = transactions.filter(t => {
    if (!t.transaction_date) return false;
    if (dashYear !== 'all' && t.transaction_date.slice(0, 4) !== dashYear) return false;
    if (dashQuarter !== 'all') {
      const m = parseInt(t.transaction_date.slice(5, 7));
      if (Math.ceil(m / 3) !== parseInt(dashQuarter)) return false;
    }
    return true;
  });

  const dashIncome   = dashTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const dashExpenses = dashTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const dashNet      = dashIncome - dashExpenses;

  const filteredPropStats = properties.map(prop => {
    const txs = dashTxs.filter(t => t.property_id === prop.id);
    const inc = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { ...prop, income: inc, expenses: exp, net: inc - exp, txCount: txs.length };
  });

  // Surface "All Properties" / null-property transactions as a synthetic card
  // so users can see where shared income & expenses landed (without it the
  // top totals would include them but the per-property breakdown would not).
  const sharedTxs = dashTxs.filter(t => !t.property_id);
  if (sharedTxs.length > 0) {
    const inc = sharedTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const exp = sharedTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    filteredPropStats.push({
      id: '__shared__',
      name: 'Shared / All Properties',
      address: 'Transactions not tied to a specific property',
      property_type: 'Shared',
      income: inc,
      expenses: exp,
      net: inc - exp,
      txCount: sharedTxs.length,
    });
  }

  const periodLabel = dashYear === 'all' ? 'ALL TIME' : dashQuarter === 'all' ? dashYear : `Q${dashQuarter} ${dashYear}`;
  const filterSelectSm = { background: '#1e2235', border: '1px solid #2d3555', color: '#e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none' };

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={dashYear} onChange={e => setDashYear(e.target.value)} style={filterSelectSm}>
          <option value="all">All Years</option>
          {dashYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={dashQuarter} onChange={e => setDashQuarter(e.target.value)} style={filterSelectSm}>
          <option value="all">All Quarters</option>
          <option value="1">Q1 — Jan–Mar</option>
          <option value="2">Q2 — Apr–Jun</option>
          <option value="3">Q3 — Jul–Sep</option>
          <option value="4">Q4 — Oct–Dec</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ background: '#0f1117', border: '1px solid #14532d', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 6 }}>TOTAL INCOME</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>{fmt(dashIncome)}</div>
        </div>
        <div style={{ background: '#0f1117', border: '1px solid #7f1d1d', borderRadius: 12, padding: '14px' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 6 }}>TOTAL EXPENSES</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f87171' }}>{fmt(dashExpenses)}</div>
        </div>
      </div>

      <div style={{ background: '#0f1117', border: `1px solid ${dashNet >= 0 ? '#14532d' : '#7f1d1d'}`, borderRadius: 12, padding: '14px', marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 6 }}>NET PROFIT / LOSS — {periodLabel}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: dashNet >= 0 ? '#4ade80' : '#f87171' }}>{fmt(dashNet)}</div>
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>PORTFOLIO — {properties.length} UNITS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredPropStats.map(p => {
          const tc = typeColor(p.property_type);
          return (
            <div key={p.id} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 14, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>{p.address}</div>
                  <span style={{ background: tc.bg, color: tc.text, fontSize: 11, padding: '3px 10px', borderRadius: 6, fontFamily: "'Courier New', monospace" }}>{p.property_type}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Net P&L</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: p.net > 0 ? '#4ade80' : p.net < 0 ? '#f87171' : '#94a3b8' }}>
                    {p.income === 0 && p.expenses === 0 ? '—' : fmt(p.net)}
                  </div>
                </div>
              </div>
              {p.note && <div style={{ fontSize: 12, color: '#94a3b8', borderTop: '1px solid #1e2235', paddingTop: 8, marginTop: 6 }}>{p.note}</div>}
              {(p.income > 0 || p.expenses > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, borderTop: '1px solid #1e2235', paddingTop: 10, marginTop: 10 }}>
                  <div><div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>Income</div><div style={{ fontSize: 13, color: '#4ade80' }}>{fmt(p.income)}</div></div>
                  <div><div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>Expenses</div><div style={{ fontSize: 13, color: '#f87171' }}>{fmt(p.expenses)}</div></div>
                  <div><div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>Txns</div><div style={{ fontSize: 13, color: '#cbd5e1' }}>{p.txCount}</div></div>
                </div>
              )}
            </div>
          );
        })}
        {properties.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: 14 }}>
            No properties yet. <span onClick={() => setActiveTab('properties')} style={{ color: '#3b82f6', cursor: 'pointer' }}>Add one →</span>
          </div>
        )}
      </div>
    </>
  );
}
