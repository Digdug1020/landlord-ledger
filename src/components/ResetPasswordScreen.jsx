import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#1e2235', border: '1px solid #2d3555',
    color: '#e2e8f0', borderRadius: 10, padding: '12px 14px',
    fontSize: 16, outline: 'none', marginBottom: 10,
  };

  async function handleReset(e) {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else setSuccess('Password updated! You can now sign in.');
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: 'Georgia, serif' }}>
          Landlord<span style={{ color: '#3b82f6' }}>Ledger</span>
        </div>
        <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 16, padding: 32, marginTop: 48 }}>
          <div style={{ fontSize: 16, color: '#cbd5e1', marginBottom: 24 }}>Set a new password</div>
          {success ? (
            <div style={{ color: '#4ade80', fontSize: 14 }}>{success}</div>
          ) : (
            <form onSubmit={handleReset}>
              <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, marginBottom: 16 }} />
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                background: '#1d4ed8', color: '#fff', fontSize: 16, cursor: 'pointer', fontWeight: 600
              }}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
          {error && <div style={{ marginTop: 12, color: '#f87171', fontSize: 13 }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}
