import { useApp } from '../AppContext';

export default function BillingTab() {
  const { session, business, subscription } = useApp();

  async function startCheckout(plan) {
    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_email: session.user.email, business_id: business.id, plan }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert('Error starting checkout. Try again.');
  }

  const trialEnd = business?.trial_ends_at ? new Date(business.trial_ends_at) : null;
  const now = new Date();
  const daysLeft = trialEnd ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)) : 0;
  const inTrial = daysLeft > 0;

  const features = ['Unlimited properties', 'Recurring transactions', 'Monthly P&L charts', 'Tax reports', 'Notes', 'Cancel anytime'];

  return (
    <>
      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 20 }}>SUBSCRIPTION & BILLING</div>

      {subscription.status === 'pro' ? (
        <div style={{ background: '#0f1117', border: '1px solid #14532d', borderRadius: 16, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>You're subscribed!</div>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>All features unlocked. Thank you for supporting LandlordLedger!</div>
        </div>
      ) : (
        <>
          {inTrial && (
            <div style={{ background: daysLeft <= 3 ? '#2d1515' : '#1a2e1a', border: `1px solid ${daysLeft <= 3 ? '#f87171' : '#4ade80'}`, borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: daysLeft <= 3 ? '#f87171' : '#4ade80', marginBottom: 4 }}>
                {daysLeft <= 3 ? `⚠️ Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}!` : `✅ Free trial — ${daysLeft} days remaining`}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Full access to all features. Subscribe to keep your data after the trial.</div>
            </div>
          )}
          {!inTrial && (
            <div style={{ background: '#2d1515', border: '1px solid #f87171', borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>⚠️ Your free trial has ended</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Subscribe to continue using LandlordLedger.</div>
            </div>
          )}

          <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 16, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Monthly</div>
              <div>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>$12</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>/mo</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {features.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#cbd5e1' }}>
                  <span style={{ color: '#4ade80' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={() => startCheckout('monthly')} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: '1px solid #2d3555', background: '#1e2235', color: '#e2e8f0', fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>
              Subscribe Monthly →
            </button>
          </div>

          <div style={{ background: '#0f1117', border: '2px solid #3b82f6', borderRadius: 16, padding: 24, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -12, left: 24, background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, fontFamily: "'Courier New', monospace" }}>BEST VALUE — SAVE $45</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Annual</div>
              <div>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>$99</span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>/year</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#4ade80', marginBottom: 12 }}>Only $8.25/month — 2 months free!</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {['Everything in Monthly', '2 months free', 'Priority support', 'Early access to new features'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#cbd5e1' }}>
                  <span style={{ color: '#4ade80' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={() => startCheckout('annual')} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 16, cursor: 'pointer', fontWeight: 700 }}>
              Subscribe Annual →
            </button>
          </div>
        </>
      )}

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #1e2235', textAlign: 'center' }}>
        <a href="/delete-account" style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}>
          Want to delete your account? →
        </a>
      </div>
    </>
  );
}
