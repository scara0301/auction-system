import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ── Animated number counter ─────────────────────────────── */
function Counter({ to, prefix = "", suffix = "", duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.floor(eased * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{prefix}{val.toLocaleString("en-IN")}{suffix}</span>;
}

/* ── SVG icons ───────────────────────────────────────────── */
const IconBolt = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconChart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconPieChart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

/* ── Data ────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <IconBolt />,
    title: "Real-time Bidding",
    desc: "Place competitive bids on live stock auctions. The dashboard refreshes every 3 seconds so you never miss a move.",
    color: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.15)",
  },
  {
    icon: <IconChart />,
    title: "IPO Access",
    desc: "Participate in Initial Public Offerings before they hit the market. Bid for allocations at price-discovery stage.",
    color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.15)",
  },
  {
    icon: <IconPieChart />,
    title: "Portfolio Tracking",
    desc: "Every allocation lands in your portfolio automatically. Track quantity, average cost, and real-time P&L in one view.",
    color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.15)",
  },
  {
    icon: <IconShield />,
    title: "Secure Allocation",
    desc: "Allocation runs as a single atomic database transaction — no double-counting, no race conditions, every rupee accounted for.",
    color: "#d97706", bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.15)",
  },
];

const STEPS = [
  { num: "01", title: "Create Account", desc: "Sign up in seconds. Your balance is set, your role is confirmed, and you're ready to bid.", color: "#2563eb" },
  { num: "02", title: "Browse & Bid", desc: "Browse live and upcoming auctions. Beat the current highest bid by at least ₹0.50 to take the lead.", color: "#7c3aed" },
  { num: "03", title: "Win & Hold", desc: "When the auction closes, shares are allocated to the top bidders. They appear in your portfolio instantly.", color: "#16a34a" },
];

const PERKS = [
  "Price-time priority allocation",
  "Atomic transactions — ACID compliant",
  "Live 3-second refresh polling",
  "JWT-secured authentication",
  "Balance enforced at bid time",
  "Watchlist & transaction history",
];

/* ── Component ───────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "var(--font-body)", overflowX: "hidden" }}>

      {/* ── Animated background orbs ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)",
          top: "-200px", left: "-100px",
          animation: "auraDrift 20s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)",
          top: "30%", right: "-150px",
          animation: "auraDrift 26s ease-in-out infinite reverse",
        }} />
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(22,163,74,0.07) 0%, transparent 70%)",
          bottom: "10%", left: "20%",
          animation: "auraDrift 18s ease-in-out infinite 5s",
        }} />
      </div>

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 60,
        background: scrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0)",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "none",
        transition: "background 0.3s, border-color 0.3s, backdrop-filter 0.3s",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "linear-gradient(135deg, #2563eb, #60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
            boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
          }}>SA</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            Stock<span style={{ color: "#2563eb" }}>Auction</span>
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "transparent", border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 8, color: "#334155", transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = "#334155"; }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/register")}
            style={{
              padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              border: "none", borderRadius: 8, color: "#fff",
              boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.45)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(37,99,235,0.35)"; }}
          >
            Get Started →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "100px 24px 60px", textAlign: "center",
      }}>
        {/* Live badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)",
          borderRadius: 20, padding: "5px 14px", marginBottom: 28,
          animation: "popIn 0.5s ease backwards",
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block", boxShadow: "0 0 6px #16a34a", animation: "pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", letterSpacing: "0.04em" }}>Live Auctions Running Now</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(42px, 8vw, 80px)", fontWeight: 900,
          lineHeight: 1.08, letterSpacing: "-0.04em",
          color: "#0f172a", marginBottom: 10,
          animation: "pageEnter 0.7s ease backwards 0.1s",
        }}>
          Bid Smart.<br />
          <span style={{
            background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #ec4899 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            backgroundSize: "200% 200%",
            animation: "gradientPan 4s ease-in-out infinite",
          }}>
            Win Shares.
          </span>
        </h1>

        <p style={{
          fontSize: "clamp(15px, 2.5vw, 19px)", color: "#64748b",
          maxWidth: 520, lineHeight: 1.65, marginBottom: 36,
          animation: "pageEnter 0.7s ease backwards 0.2s",
        }}>
          A real-time stock and IPO auction platform. Compete for share allocations through live price-discovery bidding — fair, fast, and fully transparent.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 56, animation: "pageEnter 0.7s ease backwards 0.3s" }}>
          <button
            onClick={() => navigate("/register")}
            style={{
              padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer",
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              border: "none", borderRadius: 10, color: "#fff",
              boxShadow: "0 6px 24px rgba(37,99,235,0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(37,99,235,0.5)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.4)"; }}
          >
            Start Bidding <IconArrow />
          </button>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "14px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer",
              background: "#fff", border: "1px solid #e2e8f0",
              borderRadius: 10, color: "#334155",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
          >
            Sign In →
          </button>
        </div>

        {/* Stats strip */}
        <div style={{
          display: "flex", gap: 0, flexWrap: "wrap", justifyContent: "center",
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 16, overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          animation: "pageEnter 0.7s ease backwards 0.4s",
        }}>
          {[
            { label: "Active Auctions", value: 12, suffix: "+", color: "#2563eb" },
            { label: "Total Volume",    value: 240, prefix: "₹", suffix: " Cr", color: "#7c3aed" },
            { label: "Investors",       value: 3400, suffix: "+", color: "#16a34a" },
            { label: "Shares Allocated", value: 5, suffix: "M+", color: "#d97706" },
          ].map((s, i) => (
            <div key={s.label} style={{
              padding: "20px 32px", textAlign: "center",
              borderRight: i < 3 ? "1px solid #f1f5f9" : "none",
              minWidth: 130,
            }}>
              <div style={{
                fontSize: 28, fontWeight: 900, color: s.color,
                fontFamily: "var(--font-mono)", letterSpacing: "-0.03em", lineHeight: 1,
              }}>
                <Counter to={s.value} prefix={s.prefix || ""} suffix={s.suffix || ""} />
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              Simple Process
            </div>
            <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              Three steps to your first allocation
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {STEPS.map((step, i) => (
              <div key={step.num} style={{
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 16, padding: "28px 24px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                position: "relative", overflow: "hidden",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.10)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; }}
              >
                {/* Step number watermark */}
                <div style={{
                  position: "absolute", top: -10, right: 16,
                  fontSize: 80, fontWeight: 900, color: step.color,
                  opacity: 0.06, fontFamily: "var(--font-mono)",
                  lineHeight: 1, userSelect: "none",
                }}>
                  {step.num}
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: step.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 900, fontFamily: "var(--font-mono)",
                  marginBottom: 18,
                }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 10, letterSpacing: "-0.02em" }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65 }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              Platform Features
            </div>
            <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              Everything you need to trade
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{
                background: "#fff", border: `1px solid ${f.border}`,
                borderRadius: 16, padding: "24px 20px",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 32px ${f.bg}`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: f.bg, color: f.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.01em" }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.65 }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Perks checklist ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 24px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 32 }}>
            Built on real database engineering
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {PERKS.map((p) => (
              <div key={p} style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 10, padding: "12px 16px",
                fontSize: 13, fontWeight: 600, color: "#334155",
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  background: "rgba(37,99,235,0.1)", color: "#2563eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <IconCheck />
                </span>
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section style={{
        position: "relative", zIndex: 1, padding: "80px 24px",
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)",
        textAlign: "center", overflow: "hidden",
      }}>
        {/* Glow orbs inside CTA */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.05)", top: "-150px", right: "-100px" }} />
          <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", bottom: "-100px", left: "10%" }} />
        </div>
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 14 }}>
            Ready to place your first bid?
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
            Create a free account and start bidding on live auctions in under 2 minutes.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/register")}
              style={{
                padding: "14px 36px", fontSize: 15, fontWeight: 700, cursor: "pointer",
                background: "#fff", border: "none",
                borderRadius: 10, color: "#2563eb",
                boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
                transition: "transform 0.2s, box-shadow 0.2s",
                display: "flex", alignItems: "center", gap: 8,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(0,0,0,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.2)"; }}
            >
              Create Free Account <IconArrow />
            </button>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "14px 36px", fontSize: 15, fontWeight: 600, cursor: "pointer",
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 10, color: "#fff",
                backdropFilter: "blur(8px)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        position: "relative", zIndex: 1,
        padding: "24px 40px",
        background: "#0f172a",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #2563eb, #60a5fa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800, color: "#fff",
          }}>SA</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
            Stock<span style={{ color: "#60a5fa" }}>Auction</span>
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#475569" }}>
          Built with React · Node.js · PostgreSQL · ACID transactions
        </div>
      </footer>

      {/* Pulse keyframe for the live dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
