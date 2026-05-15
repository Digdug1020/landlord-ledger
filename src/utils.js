export const CATEGORIES = [
  'Loan Payment', 'Materials', 'Repairs', 'Insurance',
  'Utilities', 'Labor', 'Equipment', 'Platform Fees', 'Other',
];

export const TAX_CATEGORIES = {
  'Loan Payment': 'Interest (deductible portion)',
  'Materials': 'Cost of Goods / Supplies',
  'Repairs': 'Repairs & Maintenance',
  'Insurance': 'Business Insurance',
  'Utilities': 'Utilities',
  'Labor': 'Contract Labor',
  'Equipment': 'Depreciation / Equipment',
  'Platform Fees': 'Platform Fees',
  'Other': 'Miscellaneous',
};

export const PROPERTY_TYPES = [
  'Residential', 'Airbnb', 'For Sale', 'Under Construction', 'Commercial', 'Other',
];

export function fmt(n) {
  return (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function printProperty(prop, transactions) {
  const txs = transactions.filter(t => t.property_id === prop.id);
  const income   = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;
  const rows = txs.map(t =>
    `<tr><td>${t.transaction_date}</td><td>${t.description || ''}</td><td>${t.category || '—'}</td><td style="color:${t.amount >= 0 ? 'green' : 'red'}">${fmt(t.amount)}</td></tr>`
  ).join('');
  const html = `<html><head><title>${prop.name} — LandlordLedger</title>
    <style>body{font-family:Georgia,serif;padding:40px;color:#111}h1{font-size:22px;margin-bottom:4px}h2{font-size:14px;color:#555;margin-bottom:24px;font-weight:normal}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f0f0f0;text-align:left;padding:8px 12px;font-size:13px;border-bottom:2px solid #ccc}td{padding:8px 12px;font-size:13px;border-bottom:1px solid #eee}.summary{margin-top:24px;border-top:2px solid #ccc;padding-top:16px}.summary div{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}.net{font-weight:bold;font-size:16px}</style>
    </head><body>
    <h1>LandlordLedger — ${prop.name}</h1>
    <h2>${prop.address || ''} | ${prop.property_type || ''} | YTD</h2>
    <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="summary">
      <div><span>Total Income</span><span style="color:green">${fmt(income)}</span></div>
      <div><span>Total Expenses</span><span style="color:red">${fmt(expenses)}</span></div>
      <div class="net"><span>Net P&L</span><span style="color:${net >= 0 ? 'green' : 'red'}">${fmt(net)}</span></div>
    </div></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}

export const typeColor = (type) => {
  if (type === 'Residential')       return { bg: '#1e3a5f', text: '#93c5fd' };
  if (type === 'Airbnb')            return { bg: '#2d1b69', text: '#a78bfa' };
  if (type === 'For Sale')          return { bg: '#422006', text: '#fb923c' };
  if (type === 'Under Construction') return { bg: '#1a3a2a', text: '#86efac' };
  return { bg: '#1e2235', text: '#94a3b8' };
};

export const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#1e2235', border: '1px solid #2d3555',
  color: '#e2e8f0', borderRadius: 10, padding: '12px 14px',
  fontSize: 16, outline: 'none',
};

export async function shareApp() {
  const url = window.location.origin;
  const payload = {
    title: 'LandlordLedger',
    text: 'Property accounting, simplified — track rent, expenses, and taxes in one place.',
    url,
  };
  if (navigator.share) {
    try {
      await navigator.share(payload);
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  } catch {
    alert(`Share this link: ${url}`);
  }
}
