import { supabase } from './supabaseClient';
import { useState, useMemo, useEffect } from "react";

const CATEGORIES = ["Loan Payment", "Materials", "Repairs", "Insurance", "Utilities", "Labor", "Equipment", "Platform Fees", "Other"];

const TAX_CATEGORIES = {
  "Loan Payment": "Interest (deductible portion)",
  "Materials": "Cost of Goods / Supplies",
  "Repairs": "Repairs & Maintenance",
  "Insurance": "Business Insurance",
  "Utilities": "Utilities",
  "Labor": "Contract Labor",
  "Equipment": "Depreciation / Equipment",
  "Platform Fees": "Platform Fees",
  "Other": "Miscellaneous",
};

const PROPERTY_TYPES = ["Residential", "Airbnb", "For Sale", "Under Construction", "Commercial", "Other"];

function fmt(n) {
  return (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function printProperty(prop, transactions) {
  const txs = transactions.filter(t => t.property_id === prop.id);
  const income = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = income - expenses;
  const rows = txs.map(t => `<tr><td>${t.transaction_date}</td><td>${t.description || ""}</td><td>${t.category || "—"}</td><td style="color:${t.amount >= 0 ? "green" : "red"}">${fmt(t.amount)}</td></tr>`).join("");
  const html = `<html><head><title>${prop.name} — LandlordLedger</title>
    <style>body{font-family:Georgia,serif;padding:40px;color:#111}h1{font-size:22px;margin-bottom:4px}h2{font-size:14px;color:#555;margin-bottom:24px;font-weight:normal}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f0f0f0;text-align:left;padding:8px 12px;font-size:13px;border-bottom:2px solid #ccc}td{padding:8px 12px;font-size:13px;border-bottom:1px solid #eee}.summary{margin-top:24px;border-top:2px solid #ccc;padding-top:16px}.summary div{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}.net{font-weight:bold;font-size:16px}</style>
    </head><body>
    <h1>LandlordLedger — ${prop.name}</h1>
    <h2>${prop.address || ""} | ${prop.property_type || ""} | YTD</h2>
    <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="summary">
      <div><span>Total Income</span><span style="color:green">${fmt(income)}</span></div>
      <div><span>Total Expenses</span><span style="color:red">${fmt(expenses)}</span></div>
      <div class="net"><span>Net P&L</span><span style="color:${net >= 0 ? "green" : "red"}">${fmt(net)}</span></div>
    </div></body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.print();
}

function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // "login", "signup", "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState("");

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleEmail(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(error.message); }
      else { setSuccess("Check your email for a confirmation link!"); }
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#reset-password`
      });
      if (error) { setError(error.message); }
      else { setSuccess("Password reset email sent! Check your inbox."); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); }
    }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "#1e2235", border: "1px solid #2d3555",
    color: "#e2e8f0", borderRadius: 10, padding: "12px 14px",
    fontSize: 16, outline: "none", marginBottom: 10,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080b12", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 4, fontFamily: "Georgia, serif" }}>
          Landlord<span style={{ color: "#3b82f6" }}>Ledger</span>
        </div>
        <div style={{ fontSize: 13, color: "#94a3b8", fontFamily: "'Courier New', monospace", marginBottom: 48 }}>Property accounting, simplified.</div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 16, padding: 32 }}>
          <div style={{ fontSize: 16, color: "#cbd5e1", marginBottom: 8 }}>
            {mode === "login" ? "Sign in to your account" : mode === "signup" ? "Create your account" : "Reset your password"}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24 }}>Free to try. No credit card required.</div>

          {mode !== "forgot" && (
            <>
              <button onClick={signInWithGoogle} disabled={loading} style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "1px solid #2d3555",
                background: "#1e2235", color: "#e2e8f0", fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontWeight: 600, marginBottom: 16
              }}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: "#1e2235" }} />
                <span style={{ fontSize: 12, color: "#475569" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#1e2235" }} />
              </div>
            </>
          )}

          <form onSubmit={handleEmail}>
            <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            {mode !== "forgot" && (
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, marginBottom: 4 }} />
            )}
            {mode === "login" && (
              <div style={{ textAlign: "right", marginBottom: 16 }}>
                <button type="button" onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
                  style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 12 }}>
                  Forgot password?
                </button>
              </div>
            )}
            {mode !== "login" && <div style={{ marginBottom: 16 }} />}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
              background: "#1d4ed8", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 600, marginBottom: 12
            }}>
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
            </button>
          </form>

          {mode !== "forgot" && (
            <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}
              style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13 }}>
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          )}
          {mode === "forgot" && (
            <button onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              style={{ background: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13 }}>
              ← Back to sign in
            </button>
          )}

          {error && <div style={{ marginTop: 12, color: "#f87171", fontSize: 13 }}>{error}</div>}
          {success && <div style={{ marginTop: 12, color: "#4ade80", fontSize: 13 }}>{success}</div>}
        </div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 24 }}>
          By signing in you agree to our Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
}

function OnboardingScreen({ session, onComplete }) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [propForm, setPropForm] = useState({ name: "", address: "", property_type: "Residential", note: "" });
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "#1e2235", border: "1px solid #2d3555",
    color: "#e2e8f0", borderRadius: 10, padding: "12px 14px",
    fontSize: 16, outline: "none", marginBottom: 10,
  };

  async function createBusiness() {
    if (!businessName.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.from("businesses").insert([{
      name: businessName,
      owner_id: session.user.id,
    }]).select().single();
    if (error) { alert("Error creating business."); setLoading(false); return; }
    setLoading(false);
    setStep(2);
  }

  async function addFirstProperty() {
    if (!propForm.name.trim()) return;
    setLoading(true);

    const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", session.user.id).single();
    if (!biz) { alert("Business not found."); setLoading(false); return; }

    await supabase.from("properties").insert([{
      business_id: biz.id,
      name: propForm.name,
      address: propForm.address,
      property_type: propForm.property_type,
      note: propForm.note,
      archived: false,
    }]);

    setLoading(false);
    onComplete();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080b12", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 4, fontFamily: "Georgia, serif", textAlign: "center" }}>
          Landlord<span style={{ color: "#3b82f6" }}>Ledger</span>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'Courier New', monospace", textAlign: "center", marginBottom: 32 }}>
          Step {step} of 2 — {step === 1 ? "Name your business" : "Add your first property"}
        </div>

        <div style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 16, padding: 28 }}>
          {step === 1 ? (
            <>
              <div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 600, marginBottom: 6 }}>What's your business called?</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>This is the name that appears on your reports.</div>
              <input placeholder="e.g. Smith Properties LLC" value={businessName} onChange={e => setBusinessName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createBusiness()} style={inputStyle} autoFocus />
              <button onClick={createBusiness} disabled={loading || !businessName.trim()} style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                background: businessName.trim() ? "#1d4ed8" : "#1e2235", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 600
              }}>{loading ? "Creating..." : "Continue →"}</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 600, marginBottom: 6 }}>Add your first property</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>You can add more properties later.</div>
              <input placeholder="Property name or address" value={propForm.name} onChange={e => setPropForm(v => ({ ...v, name: e.target.value }))} style={inputStyle} autoFocus />
              <input placeholder="City, State (e.g. Tulsa, OK)" value={propForm.address} onChange={e => setPropForm(v => ({ ...v, address: e.target.value }))} style={inputStyle} />
              <select value={propForm.property_type} onChange={e => setPropForm(v => ({ ...v, property_type: e.target.value }))} style={inputStyle}>
                {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <input placeholder="Note (optional, e.g. Rented $1,200/mo)" value={propForm.note} onChange={e => setPropForm(v => ({ ...v, note: e.target.value }))} style={inputStyle} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                <button onClick={() => setStep(1)} style={{ padding: "14px 0", borderRadius: 12, border: "1px solid #2d3555", background: "transparent", color: "#94a3b8", fontSize: 15, cursor: "pointer" }}>← Back</button>
                <button onClick={addFirstProperty} disabled={loading || !propForm.name.trim()} style={{
                  padding: "14px 0", borderRadius: 12, border: "none",
                  background: propForm.name.trim() ? "#1d4ed8" : "#1e2235", color: "#fff", fontSize: 15, cursor: "pointer", fontWeight: 600
                }}>{loading ? "Saving..." : "Launch App →"}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); }
    else { setSuccess("Password updated! You can now sign in."); }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "#1e2235", border: "1px solid #2d3555",
    color: "#e2e8f0", borderRadius: 10, padding: "12px 14px",
    fontSize: 16, outline: "none", marginBottom: 10,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080b12", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 4, fontFamily: "Georgia, serif" }}>
          Landlord<span style={{ color: "#3b82f6" }}>Ledger</span>
        </div>
        <div style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 16, padding: 32, marginTop: 48 }}>
          <div style={{ fontSize: 16, color: "#cbd5e1", marginBottom: 24 }}>Set a new password</div>
          {success ? (
            <div style={{ color: "#4ade80", fontSize: 14 }}>{success}</div>
          ) : (
            <form onSubmit={handleReset}>
              <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required style={{ ...inputStyle, marginBottom: 16 }} />
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                background: "#1d4ed8", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 600
              }}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
          {error && <div style={{ marginTop: 12, color: "#f87171", fontSize: 13 }}>{error}</div>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [properties, setProperties] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterProp, setFilterProp] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTx, setNewTx] = useState({ property_id: "", transaction_date: "", description: "", category: "", amount: "", type: "income" });
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedTxIds, setSelectedTxIds] = useState([]);

  // Property editor state
  const [showPropEditor, setShowPropEditor] = useState(false);
  const [editingProp, setEditingProp] = useState(null);
  const [propForm, setPropForm] = useState({ name: "", address: "", property_type: "Residential", note: "", archived: false });

  // Recurring state
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [recurringForm, setRecurringForm] = useState({ property_id: "", description: "", amount: "", type: "income", category: "", frequency: "monthly", day_of_month: 1, next_due_date: "", end_date: "" });

  // Notes state
  const [generalNote, setGeneralNote] = useState({ id: null, content: "" });
  const [generalNoteSaving, setGeneralNoteSaving] = useState(false);
  const [propertyNotes, setPropertyNotes] = useState({});

  // Subscription state
  const [subscription, setSubscription] = useState({ status: "free" });

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: "#1e2235", border: "1px solid #2d3555",
    color: "#e2e8f0", borderRadius: 10, padding: "12px 14px",
    fontSize: 16, outline: "none",
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "PASSWORD_RECOVERY") {
        setIsResettingPassword(true);
      }
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    async function loadData() {
      const { data: bizData } = await supabase.from("businesses").select("*").eq("owner_id", session.user.id).single();
      if (!bizData) { setNeedsOnboarding(true); setDataLoading(false); return; }
      setBusiness(bizData);

      const [{ data: txData }, { data: propData }, { data: recurData }, { data: notesData }] = await Promise.all([
        supabase.from("transactions").select("*").eq("business_id", bizData.id).order("transaction_date", { ascending: true }),
        supabase.from("properties").select("*").eq("business_id", bizData.id).eq("archived", false).order("name"),
        supabase.from("recurring_transactions").select("*").eq("business_id", bizData.id).eq("active", true).order("next_due_date"),
        supabase.from("notes").select("*").eq("business_id", bizData.id)
      ]);

      if (txData) setTransactions(txData);
      if (propData) {
        setProperties(propData);
        if (propData.length > 0) setNewTx(v => ({ ...v, property_id: propData[0].id }));
      }
      if (recurData) setRecurring(recurData);
      if (notesData) {
        const general = notesData.find(n => !n.property_id);
        if (general) setGeneralNote({ id: general.id, content: general.content || "" });
        const propNotes = {};
        notesData.filter(n => n.property_id).forEach(n => { propNotes[n.property_id] = { id: n.id, content: n.content || "" }; });
        setPropertyNotes(propNotes);
      }

      // Load subscription
      const { data: subData } = await supabase.from("subscriptions").select("*").eq("business_id", bizData.id).single();
      if (subData) setSubscription(subData);

      // Handle successful Stripe checkout redirect
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        await supabase.from("subscriptions").upsert([{ business_id: bizData.id, status: "pro" }], { onConflict: "business_id" });
        setSubscription({ status: "pro" });
        window.history.replaceState({}, "", "/");
      }

      setDataLoading(false);

      // Auto backfill
      try {
        await fetch("/api/post-recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: bizData.id }) });
        const { data: freshTx } = await supabase.from("transactions").select("*").eq("business_id", bizData.id).order("transaction_date", { ascending: true });
        if (freshTx) setTransactions(freshTx);
        const { data: freshRecur } = await supabase.from("recurring_transactions").select("*").eq("business_id", bizData.id).eq("active", true).order("next_due_date");
        if (freshRecur) setRecurring(freshRecur);
      } catch(e) { console.error("Backfill error:", e); }
    }
    loadData();
  }, [session]);

  async function runBackfill() {
    if (!business) return;
    try {
      await fetch("/api/post-recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: business.id }) });
      const { data: txData } = await supabase.from("transactions").select("*").eq("business_id", business.id).order("transaction_date", { ascending: true });
      if (txData) setTransactions(txData);
      const { data: recurData } = await supabase.from("recurring_transactions").select("*").eq("business_id", business.id).eq("active", true).order("next_due_date");
      if (recurData) setRecurring(recurData);
    } catch(e) { console.error("Backfill error:", e); }
  }

  async function addTransaction(tx) {
    const { data, error } = await supabase.from("transactions").insert([{
      business_id: business.id,
      property_id: tx.property_id === "all" ? null : tx.property_id,
      transaction_date: tx.transaction_date,
      description: tx.description,
      category: tx.category || null,
      amount: tx.amount,
      type: tx.type,
      source: "manual",
    }]).select().single();
    if (error) { console.error(error); alert("Error saving."); }
    else { setTransactions(prev => [...prev, data]); runBackfill(); }
  }

  async function deleteTransaction(id) {
    if (!window.confirm("Delete this transaction?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) { alert("Error deleting."); }
    else setTransactions(prev => prev.filter(t => t.id !== id));
  }

  function submitManual(e) {
    e.preventDefault();
    const amount = parseFloat(newTx.amount) * (newTx.type === "expense" ? -1 : 1);
    addTransaction({ ...newTx, amount });
    setNewTx(v => ({ ...v, transaction_date: "", description: "", category: "", amount: "", type: "income" }));
    setShowAddForm(false);
  }

  function openAddProperty() {
    setEditingProp(null);
    setPropForm({ name: "", address: "", property_type: "Residential", note: "", archived: false });
    setShowPropEditor(true);
  }

  function openEditProperty(prop) {
    setEditingProp(prop);
    setPropForm({ name: prop.name, address: prop.address || "", property_type: prop.property_type || "Residential", note: prop.note || "", archived: prop.archived || false });
    setShowPropEditor(true);
  }

  async function saveProperty(e) {
    e.preventDefault();
    if (editingProp) {
      const { data, error } = await supabase.from("properties").update({
        name: propForm.name, address: propForm.address, property_type: propForm.property_type, note: propForm.note, archived: propForm.archived
      }).eq("id", editingProp.id).select().single();
      if (error) { alert("Error saving property."); return; }
      setProperties(prev => propForm.archived ? prev.filter(p => p.id !== editingProp.id) : prev.map(p => p.id === editingProp.id ? data : p));
    } else {
      const { data, error } = await supabase.from("properties").insert([{
        business_id: business.id, name: propForm.name, address: propForm.address,
        property_type: propForm.property_type, note: propForm.note, archived: false
      }]).select().single();
      if (error) { alert("Error adding property."); return; }
      setProperties(prev => [...prev, data]);
    }
    setShowPropEditor(false);
  }

  const propStats = useMemo(() => {
    return properties.map(prop => {
      const txs = transactions.filter(t => t.property_id === prop.id);
      const income = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expenses = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      return { ...prop, income, expenses, net: income - expenses, txCount: txs.length };
    });
  }, [transactions, properties]);

  const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalNet = totalIncome - totalExpenses;
  const filtered = filterProp === "all" ? transactions : transactions.filter(t => t.property_id === filterProp);

  const taxSummary = useMemo(() => {
    const cats = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
      const label = TAX_CATEGORIES[t.category] || "Miscellaneous";
      cats[label] = (cats[label] || 0) + Math.abs(t.amount);
    });
    return cats;
  }, [transactions]);

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "transactions", label: "Transactions" },
    { id: "monthly", label: "Monthly P&L" },
    { id: "recurring", label: "Recurring" },
    { id: "notes", label: "Notes" },
    { id: "properties", label: "Properties" },
    { id: "tax report", label: "Tax Report" },
    { id: "billing", label: "⭐ Pro" },
  ];

  const typeColor = (type) => {
    if (type === "Residential") return { bg: "#1e3a5f", text: "#93c5fd" };
    if (type === "Airbnb") return { bg: "#2d1b69", text: "#a78bfa" };
    if (type === "For Sale") return { bg: "#422006", text: "#fb923c" };
    if (type === "Under Construction") return { bg: "#1a3a2a", text: "#86efac" };
    return { bg: "#1e2235", text: "#94a3b8" };
  };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#080b12", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontFamily: "'Courier New', monospace" }}>Loading...</div>
  );

  if (isResettingPassword) return <ResetPasswordScreen />;
  if (!session) return <LoginScreen />;

  if (needsOnboarding) return <OnboardingScreen session={session} onComplete={() => { setNeedsOnboarding(false); setDataLoading(true); window.location.reload(); }} />;

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#080b12", color: "#e2e8f0", fontFamily: "Georgia, serif", overflowX: "hidden" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }
        * { box-sizing: border-box; }
        input::placeholder { color: #94a3b8 !important; }
        select option { background: #0f1117; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080b12; }
        ::-webkit-scrollbar-thumb { background: #1e2235; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ background: "#0a0d16", borderBottom: "1px solid #1e2235", padding: "16px 16px 0", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
            Landlord<span style={{ color: "#3b82f6" }}>Ledger</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{business?.name}</span>
            <button onClick={() => supabase.auth.signOut()} style={{ background: "transparent", border: "1px solid #1e2235", borderRadius: 8, padding: "6px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 12, fontFamily: "'Courier New', monospace" }}>
              Sign out
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", marginTop: 10 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flexShrink: 0, padding: "10px 14px", fontSize: 13,
              fontFamily: "'Courier New', monospace", letterSpacing: 0.5,
              textTransform: "uppercase", cursor: "pointer", border: "none",
              background: activeTab === t.id ? "#1d4ed8" : "transparent",
              color: activeTab === t.id ? "#fff" : "#94a3b8",
              borderRadius: "8px 8px 0 0", whiteSpace: "nowrap",
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 16px 40px" }}>
        {dataLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8", fontFamily: "'Courier New', monospace" }}>Loading your books...</div>
        ) : (
          <>
            {/* DASHBOARD */}
            {activeTab === "dashboard" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ background: "#0f1117", border: "1px solid #14532d", borderRadius: 12, padding: "14px" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 6 }}>TOTAL INCOME</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80" }}>{fmt(totalIncome)}</div>
                  </div>
                  <div style={{ background: "#0f1117", border: "1px solid #7f1d1d", borderRadius: 12, padding: "14px" }}>
                    <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 6 }}>TOTAL EXPENSES</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#f87171" }}>{fmt(totalExpenses)}</div>
                  </div>
                </div>

                <div style={{ background: "#0f1117", border: `1px solid ${totalNet >= 0 ? "#14532d" : "#7f1d1d"}`, borderRadius: 12, padding: "14px", marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 6 }}>NET PROFIT / LOSS — YTD</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: totalNet >= 0 ? "#4ade80" : "#f87171" }}>{fmt(totalNet)}</div>
                </div>

                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>PORTFOLIO — {properties.length} UNITS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {propStats.map(p => {
                    const tc = typeColor(p.property_type);
                    return (
                      <div key={p.id} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 14, padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ flex: 1, marginRight: 12 }}>
                            <div style={{ fontSize: 15, color: "#e2e8f0", fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{p.address}</div>
                            <span style={{ background: tc.bg, color: tc.text, fontSize: 11, padding: "3px 10px", borderRadius: 6, fontFamily: "'Courier New', monospace" }}>{p.property_type}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Net P&L</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: p.net > 0 ? "#4ade80" : p.net < 0 ? "#f87171" : "#94a3b8" }}>
                              {p.income === 0 && p.expenses === 0 ? "—" : fmt(p.net)}
                            </div>
                          </div>
                        </div>
                        {p.note && <div style={{ fontSize: 12, color: "#94a3b8", borderTop: "1px solid #1e2235", paddingTop: 8, marginTop: 6 }}>{p.note}</div>}
                        {(p.income > 0 || p.expenses > 0) && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, borderTop: "1px solid #1e2235", paddingTop: 10, marginTop: 10 }}>
                            <div><div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>Income</div><div style={{ fontSize: 13, color: "#4ade80" }}>{fmt(p.income)}</div></div>
                            <div><div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>Expenses</div><div style={{ fontSize: 13, color: "#f87171" }}>{fmt(p.expenses)}</div></div>
                            <div><div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>Txns</div><div style={{ fontSize: 13, color: "#cbd5e1" }}>{p.txCount}</div></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {properties.length === 0 && (
                    <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 14 }}>
                      No properties yet. <span onClick={() => setActiveTab("properties")} style={{ color: "#3b82f6", cursor: "pointer" }}>Add one →</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TRANSACTIONS */}
            {activeTab === "transactions" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 }}>
                  <select value={filterProp} onChange={e => setFilterProp(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                    <option value="all">All properties</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={() => setShowAddForm(v => !v)} style={{ background: "#1d4ed8", border: "none", borderRadius: 10, padding: "12px 16px", color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>+ Add</button>
                </div>

                {filterProp !== "all" && (
                  <button onClick={() => { const prop = properties.find(p => p.id === filterProp); if (prop) printProperty(prop, transactions); }}
                    style={{ width: "100%", marginBottom: 12, background: "#1a3a2a", border: "1px solid #14532d", borderRadius: 10, padding: "10px 0", color: "#4ade80", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                    🖨️ Print / Export This Property
                  </button>
                )}

                {filtered.length > 0 && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                    <button onClick={() => setSelectedTxIds(selectedTxIds.length === filtered.length ? [] : filtered.map(t => t.id))}
                      style={{ background: "#1e2235", border: "1px solid #2d3555", borderRadius: 8, padding: "8px 14px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
                      {selectedTxIds.length === filtered.length ? "Deselect All" : "Select All"}
                    </button>
                    {selectedTxIds.length > 0 && (
                      <button onClick={async () => {
                        if (!window.confirm(`Delete ${selectedTxIds.length} transaction(s)?`)) return;
                        const { error } = await supabase.from("transactions").delete().in("id", selectedTxIds);
                        if (!error) { setTransactions(prev => prev.filter(t => !selectedTxIds.includes(t.id))); setSelectedTxIds([]); }
                      }} style={{ background: "#7f1d1d", border: "1px solid #f87171", borderRadius: 8, padding: "8px 14px", color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        🗑️ Delete {selectedTxIds.length} Selected
                      </button>
                    )}
                  </div>
                )}

                {showAddForm && (
                  <form onSubmit={submitManual} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <select value={newTx.property_id} onChange={e => setNewTx(v => ({ ...v, property_id: e.target.value }))} style={inputStyle}>
                      <option value="all">All Properties (shared expense)</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name} — {p.address}</option>)}
                    </select>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <input type="date" value={newTx.transaction_date} onChange={e => setNewTx(v => ({ ...v, transaction_date: e.target.value }))} required style={inputStyle} />
                      <select value={newTx.type} onChange={e => setNewTx(v => ({ ...v, type: e.target.value }))} style={inputStyle}>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>
                    <input placeholder="Description" value={newTx.description} onChange={e => setNewTx(v => ({ ...v, description: e.target.value }))} required style={inputStyle} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <select value={newTx.category} onChange={e => setNewTx(v => ({ ...v, category: e.target.value }))} style={inputStyle}>
                        <option value="">Income / Rent</option>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input type="number" placeholder="Amount" value={newTx.amount} onChange={e => setNewTx(v => ({ ...v, amount: e.target.value }))} required style={inputStyle} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <button type="submit" style={{ background: "#1d4ed8", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 15, padding: "12px 0", fontWeight: 600 }}>Save</button>
                      <button type="button" onClick={() => setShowAddForm(false)} style={{ background: "#1e2235", border: "none", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 15, padding: "12px 0" }}>Cancel</button>
                    </div>
                  </form>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...filtered].reverse().map((tx) => {
                    const isSelected = selectedTxIds.includes(tx.id);
                    return (
                      <div key={tx.id} onClick={() => setSelectedTxIds(prev => isSelected ? prev.filter(id => id !== tx.id) : [...prev, tx.id])}
                        style={{ background: isSelected ? "#1a2540" : "#0f1117", border: `1px solid ${isSelected ? "#3b82f6" : "#1e2235"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, marginRight: 12 }}>
                            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? "#3b82f6" : "#2d3555"}`, background: isSelected ? "#3b82f6" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {isSelected && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
                            </div>
                            <div style={{ fontSize: 15, color: "#e2e8f0", fontWeight: 600 }}>{tx.description}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ fontSize: 17, fontWeight: 700, color: tx.amount >= 0 ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>{fmt(tx.amount)}</div>
                            <button onClick={e => { e.stopPropagation(); deleteTransaction(tx.id); }} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: "0 4px" }} title="Delete">✕</button>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, paddingLeft: 28 }}>
                          {tx.property_id ? (properties.find(p => p.id === tx.property_id)?.name || "Unknown") : "Shared / All Properties"}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingLeft: 28 }}>
                          <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace" }}>{tx.transaction_date}</span>
                          {tx.category && <span style={{ fontSize: 11, color: "#94a3b8" }}>{tx.category}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8", fontSize: 14 }}>No transactions yet.</div>}
                </div>
              </>
            )}

            {/* MONTHLY P&L */}
            {activeTab === "monthly" && (
              <>
                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 16 }}>MONTHLY P&L — ACTUAL VS PROJECTED</div>
                {(() => {
                  const monthMap = {};
                  transactions.forEach(t => {
                    const month = t.transaction_date?.slice(0, 7);
                    if (!month) return;
                    if (!monthMap[month]) monthMap[month] = { income: 0, expenses: 0 };
                    if (t.amount > 0) monthMap[month].income += t.amount;
                    else monthMap[month].expenses += Math.abs(t.amount);
                  });
                  const months = Object.keys(monthMap).sort();
                  const maxVal = Math.max(...months.map(m => Math.max(monthMap[m].income, monthMap[m].expenses)), 1);
                  return months.length > 0 ? (
                    <div style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 14 }}>ACTUAL — BY MONTH</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 100, overflowX: "auto" }}>
                        {months.map((m, i) => {
                          const { income, expenses } = monthMap[m];
                          const net = income - expenses;
                          return (
                            <div key={i} style={{ flex: "0 0 auto", minWidth: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                              <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 70 }}>
                                <div style={{ flex: 1, background: "#4ade80", borderRadius: "3px 3px 0 0", height: `${(income / maxVal) * 70}px`, minHeight: income > 0 ? 2 : 0 }} />
                                <div style={{ flex: 1, background: "#f87171", borderRadius: "3px 3px 0 0", height: `${(expenses / maxVal) * 70}px`, minHeight: expenses > 0 ? 2 : 0 }} />
                              </div>
                              <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "'Courier New', monospace" }}>{m.slice(5)}</div>
                              <div style={{ fontSize: 9, color: net >= 0 ? "#4ade80" : "#f87171", fontFamily: "'Courier New', monospace" }}>{fmt(net)}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, background: "#4ade80", borderRadius: 2 }} /><span style={{ fontSize: 11, color: "#94a3b8" }}>Income</span></div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 10, height: 10, background: "#f87171", borderRadius: 2 }} /><span style={{ fontSize: 11, color: "#94a3b8" }}>Expenses</span></div>
                      </div>
                    </div>
                  ) : <div style={{ color: "#94a3b8", fontSize: 14, padding: "20px 0" }}>No transaction data yet.</div>;
                })()}

                {(() => {
                  const now = new Date();
                  const months = [];
                  for (let i = 0; i < 6; i++) {
                    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                    const label = d.toLocaleString("default", { month: "short" }) + " " + d.getFullYear();
                    let income = 0, expenses = 0;
                    recurring.forEach(r => {
                      if (r.frequency === "monthly") {
                        if (r.amount > 0) income += r.amount;
                        else expenses += Math.abs(r.amount);
                      }
                    });
                    months.push({ label, income, expenses, net: income - expenses });
                  }
                  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expenses)), 1);
                  return recurring.length > 0 ? (
                    <div style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 14 }}>6-MONTH PROJECTION (RECURRING)</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 100 }}>
                        {months.map((m, i) => (
                          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 70 }}>
                              <div style={{ flex: 1, background: "#4ade80", borderRadius: "3px 3px 0 0", height: `${(m.income / maxVal) * 70}px`, minHeight: m.income > 0 ? 2 : 0 }} />
                              <div style={{ flex: 1, background: "#f87171", borderRadius: "3px 3px 0 0", height: `${(m.expenses / maxVal) * 70}px`, minHeight: m.expenses > 0 ? 2 : 0 }} />
                            </div>
                            <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "'Courier New', monospace", textAlign: "center" }}>{m.label}</div>
                            <div style={{ fontSize: 9, color: m.net >= 0 ? "#4ade80" : "#f87171", fontFamily: "'Courier New', monospace" }}>{fmt(m.net)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>MONTH BY MONTH</div>
                {(() => {
                  const monthMap = {};
                  transactions.forEach(t => {
                    const month = t.transaction_date?.slice(0, 7);
                    if (!month) return;
                    if (!monthMap[month]) monthMap[month] = { income: 0, expenses: 0 };
                    if (t.amount > 0) monthMap[month].income += t.amount;
                    else monthMap[month].expenses += Math.abs(t.amount);
                  });
                  return Object.keys(monthMap).sort().reverse().map(month => {
                    const { income, expenses } = monthMap[month];
                    const net = income - expenses;
                    return (
                      <div key={month} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div style={{ fontSize: 15, color: "#e2e8f0", fontWeight: 600 }}>{new Date(month + "-02").toLocaleString("default", { month: "long", year: "numeric" })}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: net >= 0 ? "#4ade80" : "#f87171" }}>{fmt(net)}</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div><div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>Income</div><div style={{ fontSize: 14, color: "#4ade80" }}>{fmt(income)}</div></div>
                          <div><div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>Expenses</div><div style={{ fontSize: 14, color: "#f87171" }}>{fmt(expenses)}</div></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </>
            )}

            {/* RECURRING */}
            {activeTab === "recurring" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1 }}>RECURRING TRANSACTIONS</div>
                  <button onClick={() => { setEditingRecurring(null); setRecurringForm({ property_id: properties[0]?.id || "", description: "", amount: "", type: "income", category: "", frequency: "monthly", day_of_month: 1, next_due_date: "", end_date: "" }); setShowRecurringForm(true); }}
                    style={{ background: "#1d4ed8", border: "none", borderRadius: 10, padding: "10px 16px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                    + Add Recurring
                  </button>
                </div>

                {showRecurringForm && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const payload = {
                      business_id: business.id,
                      property_id: recurringForm.property_id === "all" ? null : recurringForm.property_id,
                      description: recurringForm.description,
                      amount: parseFloat(recurringForm.amount) * (recurringForm.type === "expense" ? -1 : 1),
                      type: recurringForm.type,
                      category: recurringForm.category || null,
                      frequency: recurringForm.frequency,
                      day_of_month: parseInt(recurringForm.day_of_month),
                      next_due_date: recurringForm.next_due_date,
                      end_date: recurringForm.end_date || null,
                      active: true,
                    };
                    if (editingRecurring) {
                      const { data, error } = await supabase.from("recurring_transactions").update(payload).eq("id", editingRecurring.id).select().single();
                      if (!error) setRecurring(prev => prev.map(r => r.id === editingRecurring.id ? data : r));
                    } else {
                      const { data, error } = await supabase.from("recurring_transactions").insert([payload]).select().single();
                      if (!error) setRecurring(prev => [...prev, data]);
                    }
                    setShowRecurringForm(false);
                    runBackfill();
                  }} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <select value={recurringForm.property_id} onChange={e => setRecurringForm(v => ({ ...v, property_id: e.target.value }))} style={inputStyle}>
                      <option value="all">All Properties (shared expense)</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input placeholder="Description" value={recurringForm.description} onChange={e => setRecurringForm(v => ({ ...v, description: e.target.value }))} required style={inputStyle} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <select value={recurringForm.type} onChange={e => setRecurringForm(v => ({ ...v, type: e.target.value }))} style={inputStyle}>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                      <input type="number" placeholder="Amount" value={recurringForm.amount} onChange={e => setRecurringForm(v => ({ ...v, amount: e.target.value }))} required style={inputStyle} />
                    </div>
                    <select value={recurringForm.category} onChange={e => setRecurringForm(v => ({ ...v, category: e.target.value }))} style={inputStyle}>
                      <option value="">Income / Rent</option>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <select value={recurringForm.frequency} onChange={e => setRecurringForm(v => ({ ...v, frequency: e.target.value }))} style={inputStyle}>
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                      <input type="number" placeholder="Day of month" min="1" max="31" value={recurringForm.day_of_month} onChange={e => setRecurringForm(v => ({ ...v, day_of_month: e.target.value }))} style={inputStyle} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>Start date:</div>
                        <input type="date" value={recurringForm.next_due_date} onChange={e => setRecurringForm(v => ({ ...v, next_due_date: e.target.value }))} required style={inputStyle} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>End date (optional):</div>
                        <input type="date" value={recurringForm.end_date || ""} onChange={e => setRecurringForm(v => ({ ...v, end_date: e.target.value }))} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <button type="submit" style={{ background: "#1d4ed8", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 15, padding: "12px 0", fontWeight: 600 }}>Save</button>
                      <button type="button" onClick={() => setShowRecurringForm(false)} style={{ background: "#1e2235", border: "none", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 15, padding: "12px 0" }}>Cancel</button>
                    </div>
                  </form>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {recurring.length === 0 && <div style={{ color: "#94a3b8", fontSize: 14, padding: "20px 0" }}>No recurring transactions set up yet.</div>}
                  {recurring.map(r => (
                    <div key={r.id} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ fontSize: 15, color: "#e2e8f0", fontWeight: 600, flex: 1, marginRight: 12 }}>{r.description}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: r.amount >= 0 ? "#4ade80" : "#f87171", whiteSpace: "nowrap" }}>{fmt(r.amount)}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{r.property_id ? properties.find(p => p.id === r.property_id)?.name : "All Properties"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontFamily: "'Courier New', monospace" }}>
                        {r.frequency} · next: {r.next_due_date}{r.end_date ? ` · ends: ${r.end_date}` : ""}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => { setEditingRecurring(r); setRecurringForm({ property_id: r.property_id || "all", description: r.description, amount: Math.abs(r.amount), type: r.type, category: r.category || "", frequency: r.frequency, day_of_month: r.day_of_month, next_due_date: r.next_due_date, end_date: r.end_date || "" }); setShowRecurringForm(true); }}
                          style={{ background: "#1e2235", border: "1px solid #2d3555", borderRadius: 8, padding: "6px 14px", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>Edit</button>
                        <button onClick={async () => {
                          if (!window.confirm("Stop this recurring transaction?")) return;
                          await supabase.from("recurring_transactions").update({ active: false }).eq("id", r.id);
                          setRecurring(prev => prev.filter(x => x.id !== r.id));
                        }} style={{ background: "#1e2235", border: "1px solid #7f1d1d", borderRadius: 8, padding: "6px 14px", color: "#f87171", cursor: "pointer", fontSize: 12 }}>Stop</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* NOTES */}
            {activeTab === "notes" && (
              <>
                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>GENERAL NOTES</div>
                <div style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 14, padding: 16, marginBottom: 24 }}>
                  <textarea value={generalNote.content} onChange={e => setGeneralNote(v => ({ ...v, content: e.target.value }))}
                    placeholder="Shared business notes..."
                    rows={6} style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", color: "#e2e8f0", fontSize: 15, resize: "vertical", outline: "none", lineHeight: 1.6 }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8, borderTop: "1px solid #1e2235", paddingTop: 10 }}>
                    <button onClick={async () => {
                      setGeneralNoteSaving(true);
                      if (generalNote.id) {
                        await supabase.from("notes").update({ content: generalNote.content, updated_at: new Date().toISOString(), updated_by: session.user.email }).eq("id", generalNote.id);
                      } else {
                        const { data } = await supabase.from("notes").insert([{ business_id: business.id, content: generalNote.content, updated_by: session.user.email }]).select().single();
                        if (data) setGeneralNote({ id: data.id, content: data.content });
                      }
                      setGeneralNoteSaving(false);
                    }} style={{ background: "#1d4ed8", border: "none", borderRadius: 8, padding: "8px 18px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      {generalNoteSaving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setGeneralNote(v => ({ ...v, content: "" }))} style={{ background: "#1e2235", border: "none", borderRadius: 8, padding: "8px 18px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>Clear</button>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>NOTES BY PROPERTY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {properties.map(p => {
                    const note = propertyNotes[p.id] || { id: null, content: "" };
                    return (
                      <div key={p.id} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 14, padding: 16 }}>
                        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>{p.address}</div>
                        <textarea value={note.content} onChange={e => setPropertyNotes(prev => ({ ...prev, [p.id]: { ...note, content: e.target.value } }))}
                          placeholder="Add notes, tenant info, schedule..."
                          rows={3} style={{ width: "100%", boxSizing: "border-box", background: "#1e2235", border: "1px solid #2d3555", borderRadius: 8, color: "#e2e8f0", fontSize: 14, resize: "vertical", outline: "none", padding: "10px 12px", lineHeight: 1.5 }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                          <a href="https://calendar.google.com" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}>📅 Google Calendar</a>
                          <button onClick={async () => {
                            if (note.id) {
                              await supabase.from("notes").update({ content: note.content, updated_at: new Date().toISOString(), updated_by: session.user.email }).eq("id", note.id);
                            } else {
                              const { data } = await supabase.from("notes").insert([{ business_id: business.id, property_id: p.id, content: note.content, updated_by: session.user.email }]).select().single();
                              if (data) setPropertyNotes(prev => ({ ...prev, [p.id]: { id: data.id, content: data.content } }));
                            }
                          }} style={{ background: "#1d4ed8", border: "none", borderRadius: 8, padding: "6px 16px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Save</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* PROPERTIES */}
            {activeTab === "properties" && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1 }}>MANAGE PROPERTIES</div>
                  <button onClick={openAddProperty} style={{ background: "#1d4ed8", border: "none", borderRadius: 10, padding: "10px 16px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>+ Add Property</button>
                </div>

                {showPropEditor && (
                  <form onSubmit={saveProperty} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4 }}>{editingProp ? "Edit Property" : "Add New Property"}</div>
                    <input placeholder="Property name or address" value={propForm.name} onChange={e => setPropForm(v => ({ ...v, name: e.target.value }))} required style={inputStyle} />
                    <input placeholder="City, State" value={propForm.address} onChange={e => setPropForm(v => ({ ...v, address: e.target.value }))} style={inputStyle} />
                    <select value={propForm.property_type} onChange={e => setPropForm(v => ({ ...v, property_type: e.target.value }))} style={inputStyle}>
                      {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input placeholder="Note (optional)" value={propForm.note} onChange={e => setPropForm(v => ({ ...v, note: e.target.value }))} style={inputStyle} />
                    {editingProp && (
                      <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#f87171", fontSize: 14, cursor: "pointer" }}>
                        <input type="checkbox" checked={propForm.archived} onChange={e => setPropForm(v => ({ ...v, archived: e.target.checked }))} />
                        Archive this property (hide from app)
                      </label>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <button type="submit" style={{ background: "#1d4ed8", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 15, padding: "12px 0", fontWeight: 600 }}>Save</button>
                      <button type="button" onClick={() => setShowPropEditor(false)} style={{ background: "#1e2235", border: "none", borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 15, padding: "12px 0" }}>Cancel</button>
                    </div>
                  </form>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {propStats.map(p => {
                    const tc = typeColor(p.property_type);
                    return (
                      <div key={p.id} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 14, padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, color: "#e2e8f0", fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>{p.address}</div>
                            <span style={{ background: tc.bg, color: tc.text, fontSize: 11, padding: "3px 10px", borderRadius: 6, fontFamily: "'Courier New', monospace" }}>{p.property_type}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                            <button onClick={() => openEditProperty(p)} style={{ background: "#1e2235", border: "1px solid #2d3555", borderRadius: 8, padding: "6px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 12 }}>Edit</button>
                            <button onClick={() => printProperty(p, transactions)} style={{ background: "#1a3a2a", border: "1px solid #14532d", borderRadius: 8, padding: "6px 12px", color: "#4ade80", cursor: "pointer", fontSize: 12 }}>🖨️ Print</button>
                          </div>
                        </div>
                        {p.note && <div style={{ fontSize: 12, color: "#94a3b8", borderTop: "1px solid #1e2235", paddingTop: 8, marginTop: 6 }}>{p.note}</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAX REPORT */}
            {activeTab === "tax report" && (
              <>
                <div style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 14, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 4 }}>SCHEDULE E — DEDUCTIBLE EXPENSES</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>Year-to-date. Consult your CPA before filing.</div>
                  {Object.entries(taxSummary).length === 0
                    ? <div style={{ fontSize: 14, color: "#94a3b8", padding: "12px 0" }}>No expenses logged yet.</div>
                    : Object.entries(taxSummary).map(([label, amt]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid #1e2235" }}>
                        <div style={{ fontSize: 14, color: "#e2e8f0" }}>{label}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#f87171" }}>{fmt(amt)}</div>
                      </div>
                    ))
                  }
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
                    <div style={{ fontSize: 14, color: "#cbd5e1", fontWeight: 600 }}>Total Deductible</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#f87171" }}>{fmt(totalExpenses)}</div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 12 }}>NET BY PROPERTY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {propStats.map(p => {
                    const tc = typeColor(p.property_type);
                    return (
                      <div key={p.id} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 12, padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 14, color: "#e2e8f0", marginBottom: 4 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>{p.address}</div>
                            <span style={{ background: tc.bg, color: tc.text, fontSize: 11, padding: "3px 10px", borderRadius: 6, fontFamily: "'Courier New', monospace" }}>{p.property_type}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Net</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: p.net >= 0 ? "#4ade80" : "#f87171" }}>
                              {p.income === 0 && p.expenses === 0 ? "—" : fmt(p.net)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, borderTop: "1px solid #1e2235", paddingTop: 10 }}>
                          <div><div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>Gross Income</div><div style={{ fontSize: 13, color: "#4ade80" }}>{fmt(p.income)}</div></div>
                          <div><div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>Expenses</div><div style={{ fontSize: 13, color: "#f87171" }}>{fmt(p.expenses)}</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* BILLING */}
            {activeTab === "billing" && (
              <>
                <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Courier New', monospace", letterSpacing: 1, marginBottom: 20 }}>SUBSCRIPTION & BILLING</div>

                {subscription.status === "pro" ? (
                  <div style={{ background: "#0f1117", border: "1px solid #14532d", borderRadius: 16, padding: 28, textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>You're on Pro!</div>
                    <div style={{ fontSize: 14, color: "#94a3b8" }}>All features unlocked. Thank you for supporting LandlordLedger!</div>
                  </div>
                ) : (
                  <>
                    {/* Free tier */}
                    <div style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 16, padding: 24, marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Free</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0" }}>$0</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {["Up to 2 properties", "Manual transactions", "Basic dashboard"].map(f => (
                          <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#94a3b8" }}>
                            <span style={{ color: "#4ade80" }}>✓</span> {f}
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 16, padding: "10px 0", borderRadius: 10, background: "#1e2235", textAlign: "center", fontSize: 14, color: "#94a3b8" }}>
                        Current plan
                      </div>
                    </div>

                    {/* Pro tier */}
                    <div style={{ background: "#0f1117", border: "2px solid #3b82f6", borderRadius: 16, padding: 24, position: "relative" }}>
                      <div style={{ position: "absolute", top: -12, left: 24, background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, fontFamily: "'Courier New', monospace" }}>RECOMMENDED</div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>Pro</div>
                        <div>
                          <span style={{ fontSize: 22, fontWeight: 700, color: "#e2e8f0" }}>$19</span>
                          <span style={{ fontSize: 13, color: "#94a3b8" }}>/mo</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                        {["Unlimited properties", "Recurring transactions", "Monthly P&L charts", "Tax reports", "Notes & Google Calendar", "Email alerts", "Priority support"].map(f => (
                          <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#cbd5e1" }}>
                            <span style={{ color: "#4ade80" }}>✓</span> {f}
                          </div>
                        ))}
                      </div>
                      <button onClick={async () => {
                        const res = await fetch("/api/create-checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ user_email: session.user.email, business_id: business.id })
                        });
                        const data = await res.json();
                        if (data.url) window.location.href = data.url;
                        else alert("Error starting checkout. Try again.");
                      }} style={{
                        width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                        background: "#1d4ed8", color: "#fff", fontSize: 16, cursor: "pointer", fontWeight: 700
                      }}>
                        Upgrade to Pro →
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
