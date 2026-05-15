import { useState } from 'react';
import { useApp } from '../AppContext';
import { fmt } from '../utils';

export default function MonthlyPLTab() {
  const { transactions, recurring } = useApp();
  const [pnlYear, setPnlYear] = useState(String(new Date().getFullYear()));
  const [pnlQuarter, setPnlQuarter] = useState('all');

  const pnlYears = [...new Set(transactions.map(t => t.transaction_date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const nowYear = String(new Date().getFullYear());
  if (!pnlYears.includes(nowYear)) pnlYears.unshift(nowYear);

  const pnlTxs = transactions.filter(t => {
    if (!t.transaction_date) return false;
    if (pnlYear !== 'all' && t.transaction_date.slice(0, 4) !== pnlYear) return false;
    if (pnlQuarter !== 'all') {
      const m = parseInt(t.transaction_date.slice(5, 7));
      if (Math.ceil(m / 3) !== parseInt(pnlQuarter)) return false;
    }
    return true;
  });

  const filterSelectSm = { background: '#1e2235', border: '1px solid #2d3555', color: '#e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none' };

  const monthMap = {};
  pnlTxs.forEach(t => {
    const month = t.transaction_date?.slice(0, 7);
    if (!month) return;
    if (!monthMap[month]) monthMap[month] = { income: 0, expenses: 0 };
    if (t.amount > 0) monthMap[month].income += t.amount;
    else monthMap[month].expenses += Math.abs(t.amount);
  });
  const months = Object.keys(monthMap).sort();
  const maxVal = Math.max(...months.map(m => Math.max(monthMap[m].income, monthMap[m].expenses)), 1);

  const projMonths = (() => {
    const now = new Date();
    const result = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear();
      let income = 0, expenses = 0;
      recurring.forEach(r => {
        if (r.frequency === 'monthly') {
          if (r.amount > 0) income += r.amount;
          else expenses += Math.abs(r.amount);
        }
      });
      result.push({ label, income, expenses, net: income - expenses });
    }
    return result;
  })();
  const projMax = Math.max(...projMonths.map(m => Math.max(m.income, m.expenses)), 1);

  return (
    <>
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>MONTHLY P&L — ACTUAL VS PROJECTED</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={pnlYear} onChange={e => setPnlYear(e.target.value)} style={filterSelectSm}>
          <option value="all">All Years</option>
          {pnlYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={pnlQuarter} onChange={e => setPnlQuarter(e.target.value)} style={filterSelectSm}>
          <option value="all">All Quarters</option>
          <option value="1">Q1 — Jan–Mar</option>
          <option value="2">Q2 — Apr–Jun</option>
          <option value="3">Q3 — Jul–Sep</option>
          <option value="4">Q4 — Oct–Dec</option>
        </select>
      </div>

      {months.length > 0 ? (
        <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 14 }}>ACTUAL — BY MONTH</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100, overflowX: 'auto' }}>
            {months.map((m, i) => {
              const { income, expenses } = monthMap[m];
              const net = income - expenses;
              return (
                <div key={i} style={{ flex: '0 0 auto', minWidth: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 70 }}>
                    <div style={{ flex: 1, background: '#4ade80', borderRadius: '3px 3px 0 0', height: `${(income / maxVal) * 70}px`, minHeight: income > 0 ? 2 : 0 }} />
                    <div style={{ flex: 1, background: '#f87171', borderRadius: '3px 3px 0 0', height: `${(expenses / maxVal) * 70}px`, minHeight: expenses > 0 ? 2 : 0 }} />
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: "'Courier New', monospace" }}>{m.slice(5)}</div>
                  <div style={{ fontSize: 9, color: net >= 0 ? '#4ade80' : '#f87171', fontFamily: "'Courier New', monospace" }}>{fmt(net)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, background: '#4ade80', borderRadius: 2 }} /><span style={{ fontSize: 11, color: '#94a3b8' }}>Income</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 10, height: 10, background: '#f87171', borderRadius: 2 }} /><span style={{ fontSize: 11, color: '#94a3b8' }}>Expenses</span></div>
          </div>
        </div>
      ) : (
        <div style={{ color: '#94a3b8', fontSize: 14, padding: '20px 0' }}>No transaction data for this period.</div>
      )}

      {recurring.length > 0 && (
        <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 14 }}>6-MONTH PROJECTION (RECURRING)</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
            {projMonths.map((m, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: '100%', display: 'flex', gap: 2, alignItems: 'flex-end', height: 70 }}>
                  <div style={{ flex: 1, background: '#4ade80', borderRadius: '3px 3px 0 0', height: `${(m.income / projMax) * 70}px`, minHeight: m.income > 0 ? 2 : 0 }} />
                  <div style={{ flex: 1, background: '#f87171', borderRadius: '3px 3px 0 0', height: `${(m.expenses / projMax) * 70}px`, minHeight: m.expenses > 0 ? 2 : 0 }} />
                </div>
                <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: "'Courier New', monospace", textAlign: 'center' }}>{m.label}</div>
                <div style={{ fontSize: 9, color: m.net >= 0 ? '#4ade80' : '#f87171', fontFamily: "'Courier New', monospace" }}>{fmt(m.net)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>MONTH BY MONTH</div>
      {(() => {
        const tableMap = {};
        pnlTxs.forEach(t => {
          const month = t.transaction_date?.slice(0, 7);
          if (!month) return;
          if (!tableMap[month]) tableMap[month] = { income: 0, expenses: 0 };
          if (t.amount > 0) tableMap[month].income += t.amount;
          else tableMap[month].expenses += Math.abs(t.amount);
        });
        return Object.keys(tableMap).sort().reverse().map(month => {
          const { income, expenses } = tableMap[month];
          const net = income - expenses;
          return (
            <div key={month} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 15, color: '#e2e8f0', fontWeight: 600 }}>{new Date(month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: net >= 0 ? '#4ade80' : '#f87171' }}>{fmt(net)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>Income</div><div style={{ fontSize: 14, color: '#4ade80' }}>{fmt(income)}</div></div>
                <div><div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>Expenses</div><div style={{ fontSize: 14, color: '#f87171' }}>{fmt(expenses)}</div></div>
              </div>
            </div>
          );
        });
      })()}
    </>
  );
}
