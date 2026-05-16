import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { PROPERTY_TYPES } from '../utils';

export default function OnboardingScreen({ session, onComplete }) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [businessId, setBusinessId] = useState(null);
  const [propForm, setPropForm] = useState({ name: '', address: '', property_type: 'Residential', note: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#1e2235', border: '1px solid #2d3555',
    color: '#e2e8f0', borderRadius: 10, padding: '12px 14px',
    fontSize: 16, outline: 'none', marginBottom: 10,
  };

  async function createBusiness() {
    if (!businessName.trim()) return;
    setLoading(true);
    setError('');

    // Handle back-and-resubmit: reuse the existing business if one is already in flight
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setBusinessId(existing.id);
      setLoading(false);
      setStep(2);
      return;
    }

    const { data, error: insertErr } = await supabase
      .from('businesses')
      .insert([{ name: businessName, owner_id: session.user.id }])
      .select()
      .single();

    if (insertErr || !data) {
      setError('Could not create business: ' + (insertErr?.message || 'no row returned'));
      setLoading(false);
      return;
    }

    setBusinessId(data.id);
    setLoading(false);
    setStep(2);
  }

  async function addFirstProperty() {
    if (!propForm.name.trim()) return;
    if (!businessId) {
      setError('Business ID missing — please go back and re-enter your business name.');
      return;
    }
    setLoading(true);
    setError('');

    const { error: propErr } = await supabase.from('properties').insert([{
      business_id: businessId,
      name: propForm.name,
      address: propForm.address,
      property_type: propForm.property_type,
      note: propForm.note,
      archived: false,
    }]);

    if (propErr) {
      setError('Could not save property: ' + propErr.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onComplete();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: 'Georgia, serif', textAlign: 'center' }}>
          Landlord<span style={{ color: '#3b82f6' }}>Ledger</span>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'Courier New', monospace", textAlign: 'center', marginBottom: 32 }}>
          Step {step} of 2 — {step === 1 ? 'Name your business' : 'Add your first property'}
        </div>
        <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 16, padding: 28 }}>
          {step === 1 ? (
            <>
              <div style={{ fontSize: 18, color: '#e2e8f0', fontWeight: 600, marginBottom: 6 }}>What's your business called?</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>This is the name that appears on your reports.</div>
              <input placeholder="e.g. Smith Properties LLC" value={businessName} onChange={e => setBusinessName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createBusiness()} style={inputStyle} autoFocus />
              <button onClick={createBusiness} disabled={loading || !businessName.trim()} style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                background: businessName.trim() ? '#1d4ed8' : '#1e2235', color: '#fff', fontSize: 16, cursor: 'pointer', fontWeight: 600
              }}>{loading ? 'Creating...' : 'Continue →'}</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, color: '#e2e8f0', fontWeight: 600, marginBottom: 6 }}>Add your first property</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>You can add more properties later.</div>
              <input placeholder="Property name or address" value={propForm.name} onChange={e => setPropForm(v => ({ ...v, name: e.target.value }))} style={inputStyle} autoFocus />
              <input placeholder="City, State (e.g. Tulsa, OK)" value={propForm.address} onChange={e => setPropForm(v => ({ ...v, address: e.target.value }))} style={inputStyle} />
              <select value={propForm.property_type} onChange={e => setPropForm(v => ({ ...v, property_type: e.target.value }))} style={inputStyle}>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <input placeholder="Note (optional)" value={propForm.note} onChange={e => setPropForm(v => ({ ...v, note: e.target.value }))} style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                <button onClick={() => setStep(1)} style={{ padding: '14px 0', borderRadius: 12, border: '1px solid #2d3555', background: 'transparent', color: '#94a3b8', fontSize: 15, cursor: 'pointer' }}>← Back</button>
                <button onClick={addFirstProperty} disabled={loading || !propForm.name.trim()} style={{
                  padding: '14px 0', borderRadius: 12, border: 'none',
                  background: propForm.name.trim() ? '#1d4ed8' : '#1e2235', color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 600
                }}>{loading ? 'Saving...' : 'Launch App →'}</button>
              </div>
            </>
          )}
          {error && (
            <div style={{ marginTop: 14, padding: '10px 12px', background: '#2d1515', border: '1px solid #7f1d1d', borderRadius: 8, color: '#f87171', fontSize: 13, lineHeight: 1.5 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
