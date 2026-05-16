import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // "login" | "signup" | "forgot"
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState('');

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: '#1e2235', border: '1px solid #2d3555',
    color: '#e2e8f0', borderRadius: 10, padding: '12px 14px',
    fontSize: 16, outline: 'none', marginBottom: 10,
  };

  async function signInWithGoogle() {
    setLoading(true); setError('');
    Object.keys(sessionStorage).filter(k => k.startsWith('supabase')).forEach(k => sessionStorage.removeItem(k));
    Object.keys(localStorage).filter(k => k.startsWith('supabase')).forEach(k => localStorage.removeItem(k));
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleEmail(e) {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess('Check your email for a confirmation link!');
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin.replace(/\/+$/, '')}/#reset-password`
      });
      if (error) setError(error.message);
      else setSuccess('Password reset email sent! Check your inbox.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080b12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: 'Georgia, serif' }}>
          Landlord<span style={{ color: '#3b82f6' }}>Ledger</span>
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: "'Courier New', monospace", marginBottom: 48 }}>Property accounting, simplified.</div>
        <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 16, padding: 32 }}>
          <div style={{ fontSize: 16, color: '#cbd5e1', marginBottom: 8 }}>
            {mode === 'login' ? 'Sign in to your account' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>Free to try. No credit card required.</div>

          {mode !== 'forgot' && (
            <>
              <button onClick={signInWithGoogle} disabled={loading} style={{
                width: '100%', padding: '14px 0', borderRadius: 12, border: '1px solid #2d3555',
                background: '#1e2235', color: '#e2e8f0', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontWeight: 600, marginBottom: 16
              }}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: '#1e2235' }} />
                <span style={{ fontSize: 12, color: '#475569' }}>or</span>
                <div style={{ flex: 1, height: 1, background: '#1e2235' }} />
              </div>
            </>
          )}

          <form onSubmit={handleEmail}>
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            {mode !== 'forgot' && (
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, marginBottom: 4 }} />
            )}
            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                  style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12 }}>
                  Forgot password?
                </button>
              </div>
            )}
            {mode !== 'login' && <div style={{ marginBottom: 16 }} />}
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
              background: '#1d4ed8', color: '#fff', fontSize: 16, cursor: 'pointer', fontWeight: 600, marginBottom: 12
            }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'}
            </button>
          </form>

          {mode !== 'forgot' && (
            <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
              style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}>
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 13 }}>
              ← Back to sign in
            </button>
          )}

          {error && <div style={{ marginTop: 12, color: '#f87171', fontSize: 13 }}>{error}</div>}
          {success && <div style={{ marginTop: 12, color: '#4ade80', fontSize: 13 }}>{success}</div>}
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 24 }}>
          By signing in you agree to our <a href="/terms.html" style={{ color: '#3b82f6' }}>Terms of Service</a> and <a href="/privacy.html" style={{ color: '#3b82f6' }}>Privacy Policy</a>.
          {' · '}<a href="/delete-account" style={{ color: '#3b82f6' }}>Delete Account</a>
        </div>
      </div>
    </div>
  );
}
