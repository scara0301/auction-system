import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, useToast } from "../context/AppContext";
import { loginUser } from "../services/api";
import { LOGIN_BG } from "../utils/images";

export default function Login() {
  const { login }    = useAuth();
  const { addToast } = useToast();
  const navigate     = useNavigate();
  const [form, setForm]       = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await loginUser(form);
      login(res.data.user, res.data.token);
      addToast(`Welcome back, ${res.data.user.name}`, "success");
      navigate(res.data.user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === "admin") setForm({ username: "admin",  password: "admin123" });
    else                  setForm({ username: "rajesh", password: "pass123" });
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>

      {/* ── Left: photo panel ── */}
      <div style={{
        flex:"0 0 58%", position:"relative", overflow:"hidden",
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
        padding:"48px 56px",
      }}>
        {/* Background photo */}
        <img
          src={LOGIN_BG}
          alt="Trading platform"
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}
        />
        {/* Overlay */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%)" }} />

        {/* Content */}
        <div style={{ position:"relative", zIndex:1 }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
            <div style={{
              width:38, height:38,
              background:"linear-gradient(135deg, #2563eb, #60a5fa)",
              borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:14, fontWeight:800, color:"#fff",
              boxShadow:"0 4px 16px rgba(37,99,235,0.5)",
            }}>SA</div>
            <span style={{ fontSize:18, fontWeight:800, color:"#fff", letterSpacing:"-0.02em" }}>StockAuction</span>
          </div>

          <h1 style={{ fontSize:38, fontWeight:800, color:"#fff", lineHeight:1.15, letterSpacing:"-0.03em", marginBottom:14 }}>
            Bid on IPOs.<br />Win allocations.
          </h1>
          <p style={{ fontSize:15, color:"rgba(255,255,255,0.65)", lineHeight:1.65, maxWidth:400, marginBottom:32 }}>
            Real-time auction bidding for initial public offerings. Secure shares at price discovery before the market opens.
          </p>

          {/* Stats strip */}
          <div style={{ display:"flex", gap:24 }}>
            {[
              { label:"Active auctions", value:"12+" },
              { label:"Total volume",    value:"₹240 Cr" },
              { label:"Investors",       value:"3,400+" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize:20, fontWeight:800, color:"#fff", fontFamily:"'JetBrains Mono', monospace" }}>{s.value}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div style={{
        flex:"0 0 42%",
        display:"flex", alignItems:"center", justifyContent:"center",
        background:"#ffffff", borderLeft:"1px solid #e2e8f0",
        padding:"48px",
      }}>
        <div style={{ width:"100%", maxWidth:340 }}>
          <h2 style={{ fontSize:24, fontWeight:800, color:"#0f172a", letterSpacing:"-0.02em", marginBottom:4 }}>
            Sign in
          </h2>
          <p style={{ fontSize:13, color:"#94a3b8", marginBottom:28 }}>
            Access your auction account
          </p>

          {/* Quick access */}
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#94a3b8", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>
              Try a demo account
            </div>
            <div style={{ display:"flex", gap:8 }}>
              {[
                { role:"investor", label:"Investor", color:"#2563eb", bg:"rgba(37,99,235,0.07)", border:"rgba(37,99,235,0.2)" },
                { role:"admin",    label:"Admin",    color:"#d97706", bg:"rgba(217,119,6,0.07)", border:"rgba(217,119,6,0.2)" },
              ].map((d) => (
                <button
                  key={d.role}
                  onClick={() => fillDemo(d.role)}
                  style={{
                    flex:1, padding:"8px 0", cursor:"pointer", fontSize:12, fontWeight:700,
                    background:d.bg, border:`1px solid ${d.border}`,
                    borderRadius:"6px", color:d.color,
                    transition:"opacity 0.15s",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22 }}>
            <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
            <span style={{ fontSize:11, color:"#94a3b8", fontWeight:500 }}>or sign in manually</span>
            <div style={{ flex:1, height:1, background:"#e2e8f0" }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label">Username</label>
              <input
                className="input-field" type="text" autoComplete="username"
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Enter username" required
              />
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <input
                className="input-field" type="password" autoComplete="current-password"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter password" required
              />
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom:14, fontSize:12 }}>{error}</div>}

            <button
              type="submit" disabled={loading} className="btn-primary"
              style={{ width:"100%", padding:"12px 20px", fontSize:14, fontWeight:700 }}
            >
              {loading
                ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><span className="spinner-sm" />Signing in…</span>
                : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#94a3b8" }}>
            No account?{" "}
            <Link to="/register" style={{ color:"#2563eb", fontWeight:600, textDecoration:"none" }}>
              Create one →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
