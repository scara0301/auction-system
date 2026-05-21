import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useToast } from "../context/AppContext";
import { registerUser } from "../services/api";

const FEATURES = [
  {
    text: "Real-time bid tracking",
    color: "#2563eb",
    bg: "rgba(37,99,235,0.08)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2"/>
        <path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49M20.49 3.51a12 12 0 010 16.97M3.51 20.49a12 12 0 010-16.97"/>
      </svg>
    ),
  },
  {
    text: "Live IPO price discovery",
    color: "#16a34a",
    bg: "rgba(22,163,74,0.08)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
  },
  {
    text: "Automatic share allocation",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.08)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  {
    text: "Portfolio & P&L tracking",
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
];

export default function Register() {
  const { login }    = useAuth();
  const { addToast } = useToast();
  const navigate     = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const field = (key, e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      const res = await registerUser(payload);
      login(res.data.user, res.data.token);
      addToast(`Welcome, ${res.data.user.name}! Your account is ready.`, "success");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* ── Left panel: brand + features ── */}
      <div style={{
        flex: "0 0 42%",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "60px 56px",
        background: "#f8fafc",
        borderRight: "1px solid #e2e8f0",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div style={{
            width: 38, height: 38,
            background: "linear-gradient(135deg, #2563eb, #60a5fa)",
            borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff",
            boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
          }}>SA</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>StockAuction</span>
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", lineHeight: 1.2, letterSpacing: "-0.03em", marginBottom: 10 }}>
          Start trading<br/>
          <span style={{ color: "#2563eb" }}>in minutes</span>
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65, marginBottom: 36 }}>
          Join our platform and participate in exclusive IPO and stock auctions with real-time bidding.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {FEATURES.map((f) => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: f.bg, color: f.color, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {f.icon}
              </div>
              <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, paddingTop: 28, borderTop: "1px solid #e2e8f0" }}>
          <p style={{ fontSize: 12, color: "#94a3b8" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div style={{
        flex: "0 0 58%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#ffffff",
        padding: "40px 64px",
      }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: 4 }}>
              Create Account
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-field">
                <label className="form-label">Full Name</label>
                <input className="input-field" value={form.name} onChange={(e) => field("name", e)} placeholder="Full name" required />
              </div>
              <div className="form-field">
                <label className="form-label">Username</label>
                <input className="input-field" value={form.username} onChange={(e) => field("username", e)} placeholder="username" required autoComplete="username" />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input className="input-field" type="email" value={form.email} onChange={(e) => field("email", e)} placeholder="you@example.com" required autoComplete="email" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-field">
                <label className="form-label">Password</label>
                <input className="input-field" type="password" value={form.password} onChange={(e) => field("password", e)} placeholder="••••••••" required autoComplete="new-password" />
              </div>
              <div className="form-field">
                <label className="form-label">Confirm Password</label>
                <input className="input-field" type="password" value={form.confirmPassword} onChange={(e) => field("confirmPassword", e)} placeholder="••••••••" required autoComplete="new-password" />
              </div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 14, fontSize: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", padding: "12px 20px", fontSize: 14, fontWeight: 700, marginTop: 4 }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span className="spinner-sm" /> Creating Account...
                </span>
              ) : "Create Account →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
