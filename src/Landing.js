import React from "react";
import { supabase } from "./supabaseClient";

const features = [
  {
    icon: "🏠",
    title: "Multi-Property Tracking",
    desc: "Manage income and expenses across all your properties in one place. Residential, Airbnb, commercial — all covered.",
  },
  {
    icon: "📊",
    title: "Instant P&L Reports",
    desc: "See profit and loss at a glance for each property or your entire portfolio. Print-ready reports in one click.",
  },
  {
    icon: "🗓️",
    title: "Recurring Transactions",
    desc: "Set up recurring rent, mortgage, and utility entries so your books stay current without manual entry.",
  },
  {
    icon: "🧾",
    title: "Tax-Ready Categories",
    desc: "Every transaction maps to an IRS-friendly category — repairs, depreciation, platform fees, and more.",
  },
  {
    icon: "📤",
    title: "CSV Export",
    desc: "Export your transaction history to CSV and hand it straight to your accountant or import into any spreadsheet.",
  },
  {
    icon: "🔒",
    title: "Secure & Private",
    desc: "Your financial data is encrypted and never sold. Sign in with Google or email — your choice.",
  },
];

const taxItems = [
  { label: "Loan Interest", category: "Interest (deductible portion)" },
  { label: "Repairs & Maintenance", category: "Repairs & Maintenance" },
  { label: "Insurance", category: "Business Insurance" },
  { label: "Utilities", category: "Utilities" },
  { label: "Contract Labor", category: "Contract Labor" },
  { label: "Depreciation / Equipment", category: "Depreciation / Equipment" },
  { label: "Platform Fees", category: "Platform Fees" },
  { label: "Miscellaneous", category: "Miscellaneous" },
];

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{
      background: "#0f1117",
      border: "1px solid #1e2235",
      borderRadius: 16,
      padding: "28px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9" }}>{title}</div>
      <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

export default function Landing({ onGetStarted }) {
  async function handleGetStarted() {
    await supabase.auth.signOut();
    onGetStarted();
  }

  return (
    <div style={{ background: "#080b12", minHeight: "100vh", color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 40px", borderBottom: "1px solid #1e2235",
        position: "sticky", top: 0, background: "#080b12", zIndex: 100,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia, serif" }}>
          Landlord<span style={{ color: "#3b82f6" }}>Ledger</span>
        </div>
        <button
          onClick={handleGetStarted}
          style={{
            background: "#3b82f6", color: "#fff", border: "none",
            borderRadius: 10, padding: "10px 22px", fontSize: 15,
            fontWeight: 600, cursor: "pointer",
          }}
        >
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <section style={{
        textAlign: "center", padding: "100px 24px 80px",
        maxWidth: 760, margin: "0 auto",
      }}>
        <div style={{
          display: "inline-block",
          background: "#0f1a2e", border: "1px solid #1e3a5f",
          color: "#60a5fa", fontSize: 13, fontWeight: 600,
          borderRadius: 99, padding: "6px 16px", marginBottom: 28,
          letterSpacing: "0.04em",
        }}>
          Built for landlords, not accountants
        </div>
        <h1 style={{
          fontSize: "clamp(36px, 6vw, 58px)", fontWeight: 800,
          lineHeight: 1.15, margin: "0 0 24px",
          color: "#f8fafc",
        }}>
          Property accounting<br />
          <span style={{ color: "#3b82f6" }}>without the headache</span>
        </h1>
        <p style={{
          fontSize: 19, color: "#94a3b8", lineHeight: 1.7,
          maxWidth: 560, margin: "0 auto 40px",
        }}>
          Track rent, expenses, and profits across every property you own.
          Get tax-ready reports in seconds — no spreadsheets required.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={handleGetStarted}
            style={{
              background: "#3b82f6", color: "#fff", border: "none",
              borderRadius: 12, padding: "16px 36px", fontSize: 17,
              fontWeight: 700, cursor: "pointer", letterSpacing: "0.01em",
            }}
          >
            Start Free Trial
          </button>
          <button
            onClick={handleGetStarted}
            style={{
              background: "transparent", color: "#cbd5e1",
              border: "1px solid #2d3555",
              borderRadius: 12, padding: "16px 32px", fontSize: 17,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </div>
        <div style={{ marginTop: 20, fontSize: 13, color: "#475569" }}>
          Free to try · No credit card required
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
        <h2 style={{
          textAlign: "center", fontSize: 32, fontWeight: 800,
          marginBottom: 12, color: "#f1f5f9",
        }}>
          Everything you need to run your rentals
        </h2>
        <p style={{
          textAlign: "center", color: "#94a3b8", fontSize: 16,
          marginBottom: 48, maxWidth: 520, margin: "0 auto 48px",
        }}>
          Simple enough to use in minutes. Powerful enough to replace your spreadsheet forever.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
        }}>
          {features.map(f => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Tax Section */}
      <section style={{
        maxWidth: 900, margin: "0 auto", padding: "60px 24px",
      }}>
        <div style={{
          background: "#0d1420", border: "1px solid #1e2d45",
          borderRadius: 20, padding: "48px 40px",
        }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{
              color: "#3b82f6", fontSize: 13, fontWeight: 700,
              letterSpacing: "0.06em", marginBottom: 16, textTransform: "uppercase",
            }}>
              Tax Time, Simplified
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", marginBottom: 16 }}>
              Every transaction maps to a Schedule E category
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
              LandlordLedger automatically tags your expenses with IRS-friendly labels.
              Hand your accountant a clean export — or file confidently yourself.
            </p>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}>
            {taxItems.map(item => (
              <div key={item.label} style={{
                background: "#111827", border: "1px solid #1f2d3d",
                borderRadius: 10, padding: "14px 16px",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{item.category}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "60px 24px" }}>
        <h2 style={{
          textAlign: "center", fontSize: 32, fontWeight: 800,
          marginBottom: 12, color: "#f1f5f9",
        }}>
          Simple, honest pricing
        </h2>
        <p style={{
          textAlign: "center", color: "#94a3b8", fontSize: 16,
          marginBottom: 48,
        }}>
          All features included on every plan.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}>
          {/* Monthly */}
          <div style={{
            background: "#0f1117", border: "1px solid #1e2235",
            borderRadius: 20, padding: "36px 32px",
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>Monthly</div>
            <div style={{ fontSize: 42, fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>$12</div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 28 }}>per month</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
              {["Unlimited properties", "Unlimited transactions", "P&L reports", "Tax reports", "Recurring transactions", "Mobile app"].map(item => (
                <li key={item} style={{ fontSize: 14, color: "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#3b82f6", fontWeight: 700 }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <button onClick={handleGetStarted} style={{
              width: "100%", padding: "13px 0", borderRadius: 10,
              background: "transparent", border: "1px solid #2d3555",
              color: "#cbd5e1", fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}>
              Start Free Trial
            </button>
          </div>

          {/* Annual */}
          <div style={{
            background: "#0f1a2e", border: "2px solid #3b82f6",
            borderRadius: 20, padding: "36px 32px", position: "relative",
          }}>
            <div style={{
              position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
              background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700,
              borderRadius: 99, padding: "4px 16px", letterSpacing: "0.05em",
            }}>
              BEST VALUE
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#60a5fa", marginBottom: 12 }}>Annual</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#f1f5f9" }}>$99</div>
              <div style={{
                background: "#14532d", color: "#4ade80",
                fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "3px 8px",
              }}>
                Save 31%
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 28 }}>per year · $8.25/mo</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 10 }}>
              {["Unlimited properties", "Unlimited transactions", "P&L reports", "Tax reports", "Recurring transactions", "Mobile app"].map(item => (
                <li key={item} style={{ fontSize: 14, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#3b82f6", fontWeight: 700 }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <button onClick={handleGetStarted} style={{
              width: "100%", padding: "13px 0", borderRadius: 10,
              background: "#3b82f6", border: "none",
              color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>
              Start Free Trial
            </button>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: 14, color: "#475569" }}>
          30-day free trial on all plans. No credit card required.
        </div>
      </section>

      {/* CTA */}
      <section style={{
        textAlign: "center", padding: "80px 24px 100px",
        maxWidth: 640, margin: "0 auto",
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#f1f5f9", marginBottom: 16 }}>
          Ready to get your books in order?
        </h2>
        <p style={{ fontSize: 17, color: "#94a3b8", lineHeight: 1.7, marginBottom: 40 }}>
          Join landlords who've ditched spreadsheets for something that actually works.
          Free to start — no credit card needed.
        </p>
        <button
          onClick={handleGetStarted}
          style={{
            background: "#3b82f6", color: "#fff", border: "none",
            borderRadius: 14, padding: "18px 48px", fontSize: 18,
            fontWeight: 700, cursor: "pointer",
          }}
        >
          Start Free Trial
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #1e2235", padding: "32px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Georgia, serif" }}>
          Landlord<span style={{ color: "#3b82f6" }}>Ledger</span>
        </div>
        <div style={{ fontSize: 13, color: "#475569", display: "flex", gap: 20 }}>
          <a href="/terms.html" style={{ color: "#475569", textDecoration: "none" }}>Terms</a>
          <a href="/privacy.html" style={{ color: "#475569", textDecoration: "none" }}>Privacy</a>
        </div>
        <div style={{ fontSize: 13, color: "#334155" }}>
          © {new Date().getFullYear()} LandlordLedger
        </div>
      </footer>
    </div>
  );
}
