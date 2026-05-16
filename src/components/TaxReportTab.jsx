import { useState } from 'react';
import { useApp } from '../AppContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TAX_CATEGORIES, fmt, typeColor } from '../utils';

export default function TaxReportTab() {
  const { transactions, properties, business } = useApp();
  const [taxYear, setTaxYear] = useState(String(new Date().getFullYear()));
  const [taxQuarter, setTaxQuarter] = useState('all');

  const taxYears = [...new Set(transactions.map(t => t.transaction_date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const nowYear = String(new Date().getFullYear());
  if (!taxYears.includes(nowYear)) taxYears.unshift(nowYear);

  const taxTxs = transactions.filter(t => {
    if (!t.transaction_date) return false;
    if (taxYear !== 'all' && t.transaction_date.slice(0, 4) !== taxYear) return false;
    if (taxQuarter !== 'all') {
      const m = parseInt(t.transaction_date.slice(5, 7));
      if (Math.ceil(m / 3) !== parseInt(taxQuarter)) return false;
    }
    return true;
  });

  const filteredTaxSummary = {};
  taxTxs.filter(t => t.amount < 0).forEach(t => {
    const label = TAX_CATEGORIES[t.category] || 'Miscellaneous';
    filteredTaxSummary[label] = (filteredTaxSummary[label] || 0) + Math.abs(t.amount);
  });
  const filteredTaxExpenses = taxTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const filteredTaxPropStats = properties.map(prop => {
    const txs = taxTxs.filter(t => t.property_id === prop.id);
    const inc = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const exp = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { ...prop, income: inc, expenses: exp, net: inc - exp };
  });

  // Surface null-property ("All Properties") transactions so the per-property
  // breakdown reconciles to the totals above. Appears in UI cards, print HTML,
  // and PDF/CSV exports automatically since they all iterate this array.
  const sharedTaxTxs = taxTxs.filter(t => !t.property_id);
  if (sharedTaxTxs.length > 0) {
    const inc = sharedTaxTxs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const exp = sharedTaxTxs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    filteredTaxPropStats.push({
      id: '__shared__',
      name: 'Shared / All Properties',
      address: 'Not tied to a specific property',
      property_type: 'Shared',
      income: inc,
      expenses: exp,
      net: inc - exp,
    });
  }

  const periodLabel = taxYear === 'all' ? 'All Time' : taxQuarter === 'all' ? taxYear : `Q${taxQuarter} ${taxYear}`;
  const filterSelectSm = { background: '#1e2235', border: '1px solid #2d3555', color: '#e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none' };

  function printTaxReport() {
    const expenseRows = Object.entries(filteredTaxSummary).map(([label, amt]) =>
      `<tr><td>${label}</td><td style="text-align:right;color:#c0392b">${fmt(amt)}</td></tr>`
    ).join('');
    const propRows = filteredTaxPropStats.map(p =>
      `<tr><td>${p.name}${p.address ? ` — ${p.address}` : ''}</td><td style="text-align:right;color:green">${fmt(p.income)}</td><td style="text-align:right;color:#c0392b">${fmt(p.expenses)}</td><td style="text-align:right;color:${p.net >= 0 ? 'green' : '#c0392b'};font-weight:bold">${fmt(p.net)}</td></tr>`
    ).join('');
    const html = `<html><head><title>${business?.name || 'LandlordLedger'} — Tax Report ${periodLabel}</title>
      <style>
        body{font-family:Georgia,serif;padding:40px;color:#111;max-width:800px;margin:0 auto}
        h1{font-size:22px;margin-bottom:4px}
        h2{font-size:14px;color:#555;margin-bottom:24px;font-weight:normal}
        h3{font-size:15px;margin:28px 0 8px;border-bottom:2px solid #ccc;padding-bottom:6px}
        table{width:100%;border-collapse:collapse;margin-bottom:8px}
        th{background:#f0f0f0;text-align:left;padding:8px 12px;font-size:13px;border-bottom:2px solid #ccc}
        th:not(:first-child){text-align:right}
        td{padding:8px 12px;font-size:13px;border-bottom:1px solid #eee}
        .total td{font-weight:bold;font-size:15px;border-top:2px solid #ccc;border-bottom:none}
        .note{font-size:11px;color:#888;margin-top:4px}
      </style>
      </head><body>
      <h1>${business?.name || 'LandlordLedger'} — Tax Report</h1>
      <h2>Period: ${periodLabel} &nbsp;·&nbsp; Schedule E Summary &nbsp;·&nbsp; Consult your CPA before filing.</h2>
      <h3>Schedule E — Deductible Expenses</h3>
      <table>
        <thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>${expenseRows || "<tr><td colspan='2' style='color:#888'>No expenses logged.</td></tr>"}</tbody>
        <tfoot><tr class="total"><td>Total Deductible Expenses</td><td style="text-align:right;color:#c0392b">${fmt(filteredTaxExpenses)}</td></tr></tfoot>
      </table>
      <p class="note">* Principal loan payments are not deductible. Only the interest portion qualifies.</p>
      <h3>Net P&amp;L by Property</h3>
      <table>
        <thead><tr><th>Property</th><th style="text-align:right">Gross Income</th><th style="text-align:right">Expenses</th><th style="text-align:right">Net</th></tr></thead>
        <tbody>${propRows || "<tr><td colspan='4' style='color:#888'>No properties found.</td></tr>"}</tbody>
      </table>
      </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  }

  function exportCSV() {
    const header = 'Date,Property,Description,Category,Amount,Type\n';
    const rows = taxTxs.map(t => {
      const prop = properties.find(p => p.id === t.property_id);
      return [
        t.transaction_date,
        `"${(prop?.name || '').replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.amount,
        t.amount >= 0 ? 'Income' : 'Expense',
      ].join(',');
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LandlordLedger-Transactions-${periodLabel.replace(/\s/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
    doc.setFillColor(15, 17, 23);
    doc.rect(0, 0, 216, 28, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    const lw = doc.getTextWidth('Landlord');
    doc.text('Landlord', 14, 18);
    doc.setTextColor(59, 130, 246);
    doc.text('Ledger', 14 + lw, 18);
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${business?.name || 'Tax Report'} — Schedule E`, 14, 42);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${periodLabel}  |  Generated ${new Date().toLocaleDateString()}`, 14, 50);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.4);
    doc.line(14, 54, 202, 54);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Deductible Expenses', 14, 63);
    autoTable(doc, {
      startY: 67,
      head: [['Category', 'Amount']],
      body: Object.entries(filteredTaxSummary).length
        ? Object.entries(filteredTaxSummary).map(([label, amt]) => [label, fmt(amt)])
        : [['No expenses logged', '']],
      foot: [['Total Deductible Expenses', fmt(filteredTaxExpenses)]],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 34, 53], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [239, 246, 255], textColor: [30, 30, 30], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    const noteY = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('* Principal loan payments are not deductible. Only the interest portion qualifies. Consult your CPA before filing.', 14, noteY, { maxWidth: 188 });
    const y2 = noteY + 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Net P&L by Property', 14, y2);
    autoTable(doc, {
      startY: y2 + 4,
      head: [['Property', 'Gross Income', 'Expenses', 'Net P&L']],
      body: filteredTaxPropStats.length
        ? filteredTaxPropStats.map(p => [p.name + (p.address ? `\n${p.address}` : ''), fmt(p.income), fmt(p.expenses), fmt(p.net)])
        : [['No properties', '', '', '']],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [30, 34, 53], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    doc.save(`LandlordLedger-TaxReport-${periodLabel.replace(/\s/g, '-')}.pdf`);
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={taxYear} onChange={e => setTaxYear(e.target.value)} style={filterSelectSm}>
          <option value="all">All Years</option>
          {taxYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={taxQuarter} onChange={e => setTaxQuarter(e.target.value)} style={filterSelectSm}>
          <option value="all">All Quarters</option>
          <option value="1">Q1 — Jan–Mar</option>
          <option value="2">Q2 — Apr–Jun</option>
          <option value="3">Q3 — Jul–Sep</option>
          <option value="4">Q4 — Oct–Dec</option>
        </select>
        {(taxYear !== 'all' || taxQuarter !== 'all') && (
          <span style={{ fontSize: 12, color: '#3b82f6', alignSelf: 'center', fontFamily: "'Courier New', monospace" }}>— {periodLabel}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={printTaxReport} style={{ background: '#1e2235', border: '1px solid #2d3555', color: '#e2e8f0', borderRadius: 10, padding: '10px 16px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          🖨️ Print Tax Report
        </button>
        <button onClick={exportCSV} style={{ background: '#1e2235', border: '1px solid #2d3555', color: '#e2e8f0', borderRadius: 10, padding: '10px 16px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          📥 Export CSV
        </button>
        <button onClick={exportPDF} style={{ background: '#1e2235', border: '1px solid #2d3555', color: '#e2e8f0', borderRadius: 10, padding: '10px 16px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          📄 Export PDF
        </button>
      </div>

      <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 4 }}>SCHEDULE E — DEDUCTIBLE EXPENSES</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>{periodLabel}. Consult your CPA before filing.</div>
        {Object.entries(filteredTaxSummary).length === 0
          ? <div style={{ fontSize: 14, color: '#94a3b8', padding: '12px 0' }}>No expenses for this period.</div>
          : Object.entries(filteredTaxSummary).map(([label, amt]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #1e2235' }}>
              <div style={{ fontSize: 14, color: '#e2e8f0' }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171' }}>{fmt(amt)}</div>
            </div>
          ))
        }
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 }}>
          <div style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600 }}>Total Deductible</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f87171' }}>{fmt(filteredTaxExpenses)}</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>NET BY PROPERTY</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredTaxPropStats.map(p => {
          const tc = typeColor(p.property_type);
          return (
            <div key={p.id} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 12, padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>{p.address}</div>
                  <span style={{ background: tc.bg, color: tc.text, fontSize: 11, padding: '3px 10px', borderRadius: 6, fontFamily: "'Courier New', monospace" }}>{p.property_type}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Net</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: p.net >= 0 ? '#4ade80' : '#f87171' }}>
                    {p.income === 0 && p.expenses === 0 ? '—' : fmt(p.net)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: '1px solid #1e2235', paddingTop: 10 }}>
                <div><div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>Gross Income</div><div style={{ fontSize: 13, color: '#4ade80' }}>{fmt(p.income)}</div></div>
                <div><div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>Expenses</div><div style={{ fontSize: 13, color: '#f87171' }}>{fmt(p.expenses)}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
