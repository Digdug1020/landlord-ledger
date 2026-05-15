import { useState, useMemo, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Landing from './Landing';
import { AppContext } from './AppContext';
import { shareApp } from './utils';
import LoginScreen from './components/LoginScreen';
import OnboardingScreen from './components/OnboardingScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import DashboardTab from './components/DashboardTab';
import TransactionsTab from './components/TransactionsTab';
import ImportTab from './components/ImportTab';
import MonthlyPLTab from './components/MonthlyPLTab';
import RecurringTab from './components/RecurringTab';
import NotesTab from './components/NotesTab';
import PropertiesTab from './components/PropertiesTab';
import TaxReportTab from './components/TaxReportTab';
import BillingTab from './components/BillingTab';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [business, setBusiness] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [properties, setProperties] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterProp, setFilterProp] = useState('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [subscription, setSubscription] = useState({ status: 'free' });
  const [generalNote, setGeneralNote] = useState({ id: null, content: '' });
  const [propertyNotes, setPropertyNotes] = useState({});

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') setIsResettingPassword(true);
      if (_event === 'SIGNED_IN') window.history.replaceState({}, document.title, '/');
      setSession(session);
      setAuthLoading(false);
    });
    return () => authSub.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session && showLogin) supabase.auth.signOut();
  }, [session, showLogin]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    async function loadData() {
      const { data: bizData } = await supabase.from('businesses').select('*').eq('owner_id', session.user.id).order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (cancelled) return;
      if (!bizData) { setNeedsOnboarding(true); setDataLoading(false); return; }
      setBusiness(bizData);

      const [
        { data: txData, error: txErr },
        { data: propData, error: propErr },
        { data: recurData, error: recurErr },
        { data: notesData, error: notesErr },
      ] = await Promise.all([
        supabase.from('transactions').select('*').eq('business_id', bizData.id).order('transaction_date', { ascending: true }),
        supabase.from('properties').select('*').eq('business_id', bizData.id).eq('archived', false).order('name'),
        supabase.from('recurring_transactions').select('*').eq('business_id', bizData.id).eq('active', true).order('next_due_date'),
        supabase.from('notes').select('*').eq('business_id', bizData.id).order('updated_at', { ascending: false }),
      ]);

      if (cancelled) return;

      if (txErr) console.error('[load] transactions error:', txErr.message);
      if (propErr) console.error('[load] properties error:', propErr.message);
      if (recurErr) console.error('[load] recurring error:', recurErr.message);
      if (notesErr) console.error('[load] notes error:', notesErr.message);

      if (txData) setTransactions(txData);
      if (propData) setProperties(propData);
      if (recurData) setRecurring(recurData);
      if (notesData) {
        const general = notesData.find(n => !n.property_id);
        if (general) setGeneralNote({ id: general.id, content: general.content || '' });
        const propNotes = {};
        notesData.filter(n => n.property_id).forEach(n => {
          if (!propNotes[n.property_id]) propNotes[n.property_id] = { id: n.id, content: n.content || '' };
        });
        setPropertyNotes(propNotes);
      }

      const { data: subData } = await supabase.from('subscriptions').select('*').eq('business_id', bizData.id).maybeSingle();
      if (!cancelled && subData) setSubscription(subData);

      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        await supabase.from('subscriptions').upsert([{ business_id: bizData.id, status: 'pro' }], { onConflict: 'business_id' });
        if (!cancelled) {
          setSubscription({ status: 'pro' });
          window.history.replaceState({}, '', '/');
        }
      }

      if (!cancelled) setDataLoading(false);

      try {
        await fetch('/api/post-recurring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: bizData.id }) });
        if (cancelled) return;
        const { data: freshTx } = await supabase.from('transactions').select('*').eq('business_id', bizData.id).order('transaction_date', { ascending: true });
        if (!cancelled && freshTx) setTransactions(freshTx);
        const { data: freshRecur } = await supabase.from('recurring_transactions').select('*').eq('business_id', bizData.id).eq('active', true).order('next_due_date');
        if (!cancelled && freshRecur) setRecurring(freshRecur);
      } catch (e) { console.error('Backfill error:', e); }
    }
    loadData();
    return () => { cancelled = true; };
  }, [session]);

  async function runBackfill() {
    if (!business) return;
    try {
      await fetch('/api/post-recurring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: business.id }) });
      const { data: txData } = await supabase.from('transactions').select('*').eq('business_id', business.id).order('transaction_date', { ascending: true });
      if (txData) setTransactions(txData);
      const { data: recurData } = await supabase.from('recurring_transactions').select('*').eq('business_id', business.id).eq('active', true).order('next_due_date');
      if (recurData) setRecurring(recurData);
    } catch (e) { console.error('Backfill error:', e); }
  }

  const importBatches = useMemo(() => {
    const batched = {};
    transactions.filter(t => t.source === 'import' && t.batch_id).forEach(t => {
      if (!batched[t.batch_id]) batched[t.batch_id] = [];
      batched[t.batch_id].push(t);
    });
    return Object.entries(batched).map(([id, txs]) => ({
      id,
      count: txs.length,
      importedAt: txs.reduce((min, t) => t.created_at < min ? t.created_at : min, txs[0].created_at),
      dateRange: {
        from: txs.reduce((min, t) => t.transaction_date < min ? t.transaction_date : min, txs[0].transaction_date),
        to: txs.reduce((max, t) => t.transaction_date > max ? t.transaction_date : max, txs[0].transaction_date),
      },
    })).sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }, [transactions]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'import', label: 'Import' },
    { id: 'monthly', label: 'Monthly P&L' },
    { id: 'recurring', label: 'Recurring' },
    { id: 'notes', label: 'Notes' },
    { id: 'properties', label: 'Properties' },
    { id: 'tax report', label: 'Tax Report' },
    { id: 'billing', label: '⭐ Pro' },
  ];

  const contextValue = {
    session, business, subscription,
    transactions, setTransactions,
    properties, setProperties,
    recurring, setRecurring,
    activeTab, setActiveTab,
    filterProp, setFilterProp,
    generalNote, setGeneralNote,
    propertyNotes, setPropertyNotes,
    importBatches,
    runBackfill,
  };

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: '#080b12', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: "'Courier New', monospace" }}>Loading...</div>
  );

  if (isResettingPassword) return <ResetPasswordScreen />;
  if (!session) {
    if (showLogin) return <LoginScreen />;
    return <Landing onGetStarted={() => setShowLogin(true)} />;
  }
  if (needsOnboarding) return <OnboardingScreen session={session} onComplete={() => { setNeedsOnboarding(false); setDataLoading(true); window.location.reload(); }} />;

  const trialEnd = business?.trial_ends_at ? new Date(business.trial_ends_at) : null;
  const trialExpired = trialEnd && trialEnd < new Date();
  const isPro = subscription.status === 'pro';

  if (!dataLoading && trialExpired && !isPro) return (
    <AppContext.Provider value={contextValue}>
      <div style={{ minHeight: '100vh', background: '#080b12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: 'Georgia, serif' }}>
            Landlord<span style={{ color: '#3b82f6' }}>Ledger</span>
          </div>
          <div style={{ background: '#0f1117', border: '1px solid #f87171', borderRadius: 16, padding: 32, marginTop: 32 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>🔒</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f87171', marginBottom: 8 }}>Your free trial has ended</div>
            <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 28 }}>Subscribe to keep access to your properties, transactions, and reports. Your data is safe and waiting for you.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={async () => {
                try {
                  const res = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_email: session.user.email, business_id: business.id, plan: 'monthly' }) });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else alert('Error: ' + (data.error || 'Unknown error'));
                } catch (e) { alert('Error: ' + e.message); }
              }} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: '1px solid #2d3555', background: '#1e2235', color: '#e2e8f0', fontSize: 16, cursor: 'pointer', fontWeight: 600 }}>
                Monthly — $12/mo
              </button>
              <button onClick={async () => {
                try {
                  const res = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_email: session.user.email, business_id: business.id, plan: 'annual' }) });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else alert('Error: ' + (data.error || 'Unknown error'));
                } catch (e) { alert('Error: ' + e.message); }
              }} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>
                Annual — $99/year 🏆 Best Value
              </button>
            </div>
            <button onClick={() => supabase.auth.signOut()} style={{ marginTop: 20, background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13 }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </AppContext.Provider>
  );

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{ minHeight: '100vh', width: '100%', background: '#080b12', color: '#e2e8f0', fontFamily: 'Georgia, serif', overflowX: 'hidden' }}>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
          @keyframes spin { to { transform: rotate(360deg); } }
          * { box-sizing: border-box; }
          input::placeholder { color: #94a3b8 !important; }
          select option { background: #0f1117; }
          ::-webkit-scrollbar { width: 8px; height: 8px; }
          ::-webkit-scrollbar-track { background: #080b12; }
          ::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #60a5fa; }
        `}</style>

        <div style={{ background: '#0a0d16', borderBottom: '1px solid #1e2235', padding: '16px 16px 0', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
              Landlord<span style={{ color: '#3b82f6' }}>Ledger</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{business?.name}</span>
              <button onClick={shareApp} style={{ background: 'transparent', border: '1px solid #1e2235', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontFamily: "'Courier New', monospace" }} title="Share LandlordLedger">
                📤 Share
              </button>
              <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: '1px solid #1e2235', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontFamily: "'Courier New', monospace" }}>
                Sign out
              </button>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', marginTop: 10, paddingBottom: 3 }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  flexShrink: 0, padding: '10px 14px', fontSize: 13,
                  fontFamily: "'Courier New', monospace", letterSpacing: 0.5,
                  textTransform: 'uppercase', cursor: 'pointer', border: 'none',
                  background: activeTab === t.id ? '#1d4ed8' : 'transparent',
                  color: activeTab === t.id ? '#fff' : '#94a3b8',
                  borderRadius: '8px 8px 0 0', whiteSpace: 'nowrap',
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{ position: 'absolute', right: 0, top: 10, bottom: 3, width: 40, background: 'linear-gradient(to right, transparent, #0a0d16)', pointerEvents: 'none' }} />
          </div>
        </div>

        <div style={{ padding: '20px 16px 40px' }}>
          {dataLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontFamily: "'Courier New', monospace" }}>Loading your books...</div>
          ) : (
            <>
              {activeTab === 'dashboard'    && <DashboardTab />}
              {activeTab === 'transactions' && <TransactionsTab />}
              {activeTab === 'import'       && <ImportTab />}
              {activeTab === 'monthly'      && <MonthlyPLTab />}
              {activeTab === 'recurring'    && <RecurringTab />}
              {activeTab === 'notes'        && <NotesTab />}
              {activeTab === 'properties'   && <PropertiesTab />}
              {activeTab === 'tax report'   && <TaxReportTab />}
              {activeTab === 'billing'      && <BillingTab />}
            </>
          )}
        </div>
      </div>
    </AppContext.Provider>
  );
}
