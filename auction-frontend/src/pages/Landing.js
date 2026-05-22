import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/* ── Unsplash photos ─────────────────────────────────────── */
const HERO_PHOTO    = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&h=700&fit=crop&q=80&auto=format";
const BANNER_PHOTO  = "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=1400&h=500&fit=crop&q=80&auto=format";
const TRADING_PHOTO = "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&h=400&fit=crop&q=80&auto=format";

/* ── Fake price series ───────────────────────────────────── */
const PRICE_DATA = [
  880, 920, 895, 960, 940, 1010, 985, 1050, 1030, 1100,
  1075, 1140, 1115, 1185, 1160, 1240, 1210, 1290, 1265, 1350,
  1320, 1400, 1375, 1460, 1435, 1510, 1485, 1570, 1540, 1620,
];

/* ── Animated SVG chart ──────────────────────────────────── */
function AnimatedChart() {
  const lineRef  = useRef(null);
  const areaRef  = useRef(null);
  const [ready, setReady] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);

  const W = 360, H = 180, PX = 16, PY = 14;
  const prices = PRICE_DATA;
  const n      = prices.length;
  const min    = Math.min(...prices) - 40;
  const max    = Math.max(...prices) + 40;

  const cx = (i) => PX + (i / (n - 1)) * (W - 2 * PX);
  const cy = (p) => H - PY - ((p - min) / (max - min)) * (H - 2 * PY);

  // Smooth cubic bezier path
  const smooth = (pts) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  const pts   = prices.map((p, i) => [cx(i), cy(p)]);
  const lineD = smooth(pts);
  const areaD = lineD + ` L ${cx(n - 1)} ${H - PY} L ${cx(0)} ${H - PY} Z`;

  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray  = len;
    el.style.strokeDashoffset = len;
    requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 2.4s cubic-bezier(0.4,0,0.2,1) 0.3s";
      el.style.strokeDashoffset = "0";
      setTimeout(() => setReady(true), 2700);
    });
  }, []);

  const gridYs = [0.25, 0.5, 0.75].map((t) => PY + t * (H - 2 * PY));

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {gridYs.map((gy, i) => (
          <line key={i} x1={PX} y1={gy} x2={W - PX} y2={gy}
            stroke="rgba(37,99,235,0.1)" strokeWidth="1" strokeDasharray="3,4" />
        ))}

        {/* Area fill */}
        <path d={areaD} fill="url(#areaGrad)" opacity={ready ? 1 : 0}
          style={{ transition: "opacity 0.5s ease 2.5s" }} />

        {/* Line */}
        <path ref={lineRef} d={lineD} fill="none"
          stroke="url(#lineGrad)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          filter="url(#glow)" />

        {/* Data points — appear after line draws */}
        {ready && pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={hoverIdx === i ? 5 : 3}
            fill={hoverIdx === i ? "#2563eb" : "rgba(37,99,235,0.6)"}
            stroke="#fff" strokeWidth="1.5"
            style={{ cursor: "crosshair", transition: "r 0.15s" }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}

        {/* Hover tooltip */}
        {hoverIdx !== null && (
          <g>
            <line x1={pts[hoverIdx][0]} y1={PY} x2={pts[hoverIdx][0]} y2={H - PY}
              stroke="rgba(37,99,235,0.3)" strokeWidth="1" strokeDasharray="3,3" />
            <rect
              x={Math.min(pts[hoverIdx][0] - 34, W - 80)} y={pts[hoverIdx][1] - 28}
              width={68} height={20} rx={5}
              fill="#1e3a8a" />
            <text
              x={Math.min(pts[hoverIdx][0], W - 46)} y={pts[hoverIdx][1] - 14}
              textAnchor="middle" fill="#fff"
              fontSize="10" fontWeight="700" fontFamily="monospace">
              ₹{prices[hoverIdx].toLocaleString("en-IN")}
            </text>
          </g>
        )}

        {/* Live dot at last point */}
        {ready && (
          <>
            <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="8"
              fill="rgba(37,99,235,0.15)">
              <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="4"
              fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {/* Price label */}
      <div style={{
        position: "absolute", top: 2, right: 0,
        fontSize: 11, fontWeight: 700, fontFamily: "monospace",
        color: "#16a34a", background: "rgba(22,163,74,0.1)",
        border: "1px solid rgba(22,163,74,0.2)",
        borderRadius: 6, padding: "2px 8px",
        opacity: ready ? 1 : 0, transition: "opacity 0.4s ease 2.7s",
      }}>
        ₹{prices[n - 1].toLocaleString("en-IN")} ▲ +84%
      </div>
    </div>
  );
}

/* ── Animated candlestick chart ──────────────────────────── */
function CandlestickChart() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const candles = [
    { o: 70, c: 90, h: 95, l: 65, bull: true },
    { o: 90, c: 82, h: 94, l: 78, bull: false },
    { o: 82, c: 105, h: 110, l: 79, bull: true },
    { o: 105, c: 98, h: 108, l: 92, bull: false },
    { o: 98, c: 125, h: 130, l: 95, bull: true },
    { o: 125, c: 115, h: 128, l: 110, bull: false },
    { o: 115, c: 145, h: 150, l: 112, bull: true },
    { o: 145, c: 132, h: 148, l: 128, bull: false },
    { o: 132, c: 160, h: 165, l: 129, bull: true },
    { o: 160, c: 172, h: 176, l: 155, bull: true },
    { o: 172, c: 158, h: 175, l: 153, bull: false },
    { o: 158, c: 185, h: 190, l: 155, bull: true },
  ];

  const H = 140, W = 300, PAD = 10;
  const maxP = 195, minP = 60;
  const scale = (p) => H - PAD - ((p - minP) / (maxP - minP)) * (H - 2 * PAD);
  const cw = (W - 2 * PAD) / candles.length;

  return (
    <div ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          <linearGradient id="bearGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i} x1={PAD} y1={PAD + t * (H - 2 * PAD)}
            x2={W - PAD} y2={PAD + t * (H - 2 * PAD)}
            stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        ))}

        {candles.map((c, i) => {
          const x    = PAD + i * cw + cw * 0.15;
          const bw   = cw * 0.7;
          const top  = Math.min(scale(c.o), scale(c.c));
          const bot  = Math.max(scale(c.o), scale(c.c));
          const bh   = Math.max(bot - top, 2);
          const mx   = x + bw / 2;
          const delay= `${i * 80}ms`;
          const grad = c.bull ? "url(#bullGrad)" : "url(#bearGrad)";

          return (
            <g key={i} style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "scaleY(1)" : "scaleY(0)",
              transformOrigin: `${mx}px ${H - PAD}px`,
              transition: `opacity 0.4s ease ${delay}, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}`,
            }}>
              {/* Wick */}
              <line x1={mx} y1={scale(c.h)} x2={mx} y2={scale(c.l)}
                stroke={c.bull ? "#16a34a" : "#dc2626"} strokeWidth="1.5" />
              {/* Body */}
              <rect x={x} y={top} width={bw} height={bh} rx="2"
                fill={grad} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

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
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  { icon: <IconBolt />,     title: "Real-time Bidding",   desc: "Place bids on live auctions. Leaderboard refreshes every 3 seconds so you're always in the loop.",           color: "#2563eb", bg: "rgba(37,99,235,0.08)",   border: "rgba(37,99,235,0.15)" },
  { icon: <IconChart />,    title: "IPO Access",          desc: "Bid on Initial Public Offerings at price-discovery stage — before the stock hits the open market.",           color: "#16a34a", bg: "rgba(22,163,74,0.08)",   border: "rgba(22,163,74,0.15)" },
  { icon: <IconPieChart />, title: "Portfolio Tracking",  desc: "Every allocation appears in your portfolio instantly with weighted-average cost and live P&L.",               color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.15)" },
  { icon: <IconShield />,   title: "Secure Allocation",   desc: "Allocation runs as one atomic DB transaction — ACID compliant, race-condition-proof, every rupee accounted.", color: "#d97706", bg: "rgba(217,119,6,0.08)",  border: "rgba(217,119,6,0.15)" },
];

const STEPS = [
  { num: "01", title: "Create Account",  desc: "Sign up free. Your balance is set, role confirmed, ready to bid.",                      color: "#2563eb" },
  { num: "02", title: "Browse & Bid",    desc: "Find a live auction. Beat the top bid by ₹0.50 or more to take the lead.",              color: "#7c3aed" },
  { num: "03", title: "Win & Hold",      desc: "When the auction closes, shares are allocated to top bidders — yours appear instantly.", color: "#16a34a" },
];

const PERKS = [
  "Price-time priority allocation", "Atomic ACID transactions",
  "Live 3-second polling",          "JWT-secured auth",
  "Balance enforced at bid time",   "Watchlist & history",
];

/* ── Main component ──────────────────────────────────────── */
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

      {/* ── Background orbs ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {[
          { w: 600, h: 600, top: "-200px", left: "-100px", c: "rgba(37,99,235,0.09)", dur: "20s" },
          { w: 500, h: 500, top: "30%", right: "-150px", c: "rgba(124,58,237,0.07)", dur: "26s", rev: true },
          { w: 400, h: 400, bottom: "10%", left: "20%", c: "rgba(22,163,74,0.06)", dur: "18s", delay: "5s" },
        ].map((o, i) => (
          <div key={i} style={{
            position: "absolute", width: o.w, height: o.h, borderRadius: "50%",
            background: `radial-gradient(circle, ${o.c} 0%, transparent 70%)`,
            top: o.top, left: o.left, right: o.right, bottom: o.bottom,
            animation: `auraDrift ${o.dur} ease-in-out infinite ${o.rev ? "reverse" : ""} ${o.delay || ""}`,
          }} />
        ))}
      </div>

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: 60,
        background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "none",
        transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#60a5fa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}>SA</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>Stock<span style={{ color: "#2563eb" }}>Auction</span></span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => navigate("/login")} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, color: "#334155", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = "#334155"; }}>
            Sign In
          </button>
          <button onClick={() => navigate("/register")} style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#2563eb,#3b82f6)", border: "none", borderRadius: 8, color: "#fff", boxShadow: "0 4px 14px rgba(37,99,235,0.35)", transition: "all 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.45)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(37,99,235,0.35)"; }}>
            Get Started →
          </button>
        </div>
      </nav>

      {/* ── Hero — split layout ── */}
      <section style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", padding: "80px 40px 60px", gap: 40, flexWrap: "wrap" }}>
        {/* Left: text */}
        <div style={{ flex: "1 1 360px", maxWidth: 520 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 20, padding: "5px 14px", marginBottom: 24, animation: "popIn 0.5s ease backwards" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block", boxShadow: "0 0 6px #16a34a", animation: "livePulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", letterSpacing: "0.04em" }}>Live Auctions Running Now</span>
          </div>

          <h1 style={{ fontSize: "clamp(38px,6vw,68px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.04em", color: "#0f172a", marginBottom: 16, animation: "pageEnter 0.7s ease backwards 0.1s" }}>
            Bid Smart.<br />
            <span style={{ background: "linear-gradient(135deg,#2563eb 0%,#7c3aed 50%,#ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", backgroundSize: "200% 200%", animation: "gradientPan 4s ease-in-out infinite" }}>
              Win Shares.
            </span>
          </h1>

          <p style={{ fontSize: 17, color: "#64748b", lineHeight: 1.7, marginBottom: 32, animation: "pageEnter 0.7s ease backwards 0.2s" }}>
            A real-time stock and IPO auction platform. Compete for share allocations through live price-discovery bidding — fair, fast, and fully transparent.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40, animation: "pageEnter 0.7s ease backwards 0.3s" }}>
            <button onClick={() => navigate("/register")} style={{ padding: "13px 30px", fontSize: 15, fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#2563eb,#3b82f6)", border: "none", borderRadius: 10, color: "#fff", boxShadow: "0 6px 24px rgba(37,99,235,0.4)", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(37,99,235,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.4)"; }}>
              Start Bidding <IconArrow />
            </button>
            <button onClick={() => navigate("/login")} style={{ padding: "13px 30px", fontSize: 15, fontWeight: 600, cursor: "pointer", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, color: "#334155", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", transition: "all 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}>
              Sign In →
            </button>
          </div>

          {/* Mini stats */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", animation: "pageEnter 0.7s ease backwards 0.4s" }}>
            {[
              { v: "12+",    l: "Active Auctions", c: "#2563eb" },
              { v: "₹240Cr", l: "Total Volume",    c: "#7c3aed" },
              { v: "3,400+", l: "Investors",        c: "#16a34a" },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.c, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>{s.v}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: photo + chart panel */}
        <div style={{ flex: "1 1 340px", maxWidth: 520, position: "relative", animation: "pageEnter 0.8s ease backwards 0.3s" }}>
          {/* Photo card */}
          <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.15)", position: "relative" }}>
            <img src={HERO_PHOTO} alt="Stock market" style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,23,42,0.3) 0%, rgba(15,23,42,0.7) 100%)" }} />

            {/* Overlay chart */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 16px 10px", background: "rgba(255,255,255,0.97)", backdropFilter: "blur(10px)", borderTop: "1px solid rgba(37,99,235,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>NovaTech Solutions</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", fontFamily: "monospace" }}>+84% vs base</span>
              </div>
              <AnimatedChart />
            </div>
          </div>

          {/* Floating badges */}
          <div style={{ position: "absolute", top: 16, left: -16, background: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1px solid #f1f5f9", animation: "float 3s ease-in-out infinite" }}>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Highest Bid</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", fontFamily: "monospace" }}>₹1,620</div>
            <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>▲ +2.53%</div>
          </div>

          <div style={{ position: "absolute", top: 90, right: -18, background: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: "1px solid #f1f5f9", animation: "float 4s ease-in-out infinite 1s" }}>
            <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Active Bids</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#7c3aed", fontFamily: "monospace" }}>247</div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>across 12 auctions</div>
          </div>

          <div style={{ position: "absolute", bottom: 130, right: -18, background: "linear-gradient(135deg,#2563eb,#3b82f6)", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(37,99,235,0.35)", animation: "float 3.5s ease-in-out infinite 0.5s" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Allocated</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>5M+</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>shares distributed</div>
          </div>
        </div>
      </section>

      {/* ── Photo banner ── */}
      <section style={{ position: "relative", zIndex: 1, overflow: "hidden", height: 300 }}>
        <img src={BANNER_PHOTO} alt="Trading platform" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(15,23,42,0.82) 0%, rgba(37,99,235,0.7) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
            Powered by real database engineering
          </div>
          <h2 style={{ fontSize: "clamp(22px,4vw,38px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, maxWidth: 600 }}>
            Every bid, allocation, and transaction runs inside a single ACID-compliant PostgreSQL transaction
          </h2>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 40px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Simple Process</div>
            <h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em" }}>Three steps to your first allocation</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20 }}>
            {STEPS.map((step, i) => (
              <div key={step.num} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "28px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 36px rgba(0,0,0,0.10)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; }}>
                <div style={{ position: "absolute", top: -10, right: 14, fontSize: 80, fontWeight: 900, color: step.color, opacity: 0.06, fontFamily: "var(--font-mono)", lineHeight: 1, userSelect: "none" }}>{step.num}</div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: step.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, fontFamily: "var(--font-mono)", marginBottom: 16 }}>{i + 1}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8, letterSpacing: "-0.02em" }}>{step.title}</div>
                <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65 }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features + candlestick ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 40px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 40, alignItems: "center" }}>
          {/* Left: features grid */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Platform Features</div>
            <h2 style={{ fontSize: "clamp(24px,4vw,36px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 28 }}>Everything you need to trade</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{ background: "#fff", border: `1px solid ${f.border}`, borderRadius: 14, padding: "18px 16px", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 10px 28px ${f.bg}`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: f.bg, color: f.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: photo + candlestick */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Photo */}
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}>
              <img src={TRADING_PHOTO} alt="Trading" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
            </div>

            {/* Candlestick card */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Price Action</div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 600 }}>
                  <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, background: "#16a34a", borderRadius: 2, display: "inline-block" }} /> Bull
                  </span>
                  <span style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, background: "#dc2626", borderRadius: 2, display: "inline-block" }} /> Bear
                  </span>
                </div>
              </div>
              <CandlestickChart />
            </div>
          </div>
        </div>
      </section>

      {/* ── Perks ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 40px", background: "#f8fafc" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", marginBottom: 28 }}>Built on real database engineering</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
            {PERKS.map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#334155" }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: "rgba(37,99,235,0.1)", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}><IconCheck /></span>
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats counters ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "70px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          {[
            { label: "Active Auctions",   to: 12,   suffix: "+",   color: "#2563eb" },
            { label: "Total Volume",       to: 240,  prefix: "₹",  suffix: " Cr", color: "#7c3aed" },
            { label: "Investors",          to: 3400, suffix: "+",   color: "#16a34a" },
            { label: "Shares Allocated",   to: 5,    suffix: "M+",  color: "#d97706" },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "28px 20px", textAlign: "center", borderRight: i < 3 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: s.color, fontFamily: "var(--font-mono)", letterSpacing: "-0.03em", lineHeight: 1 }}>
                <Counter to={s.to} prefix={s.prefix || ""} suffix={s.suffix || ""} />
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 24px", background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#7c3aed 100%)", textAlign: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.05)", top: "-150px", right: "-100px" }} />
          <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", bottom: "-100px", left: "10%" }} />
        </div>
        <div style={{ position: "relative" }}>
          <h2 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 14 }}>Ready to place your first bid?</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>Create a free account and start bidding on live auctions in under 2 minutes.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/register")} style={{ padding: "14px 36px", fontSize: 15, fontWeight: 700, cursor: "pointer", background: "#fff", border: "none", borderRadius: 10, color: "#2563eb", boxShadow: "0 6px 24px rgba(0,0,0,0.2)", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(0,0,0,0.3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.2)"; }}>
              Create Free Account <IconArrow />
            </button>
            <button onClick={() => navigate("/login")} style={{ padding: "14px 36px", fontSize: 15, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, color: "#fff", backdropFilter: "blur(8px)", transition: "background 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: "relative", zIndex: 1, padding: "24px 40px", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#2563eb,#60a5fa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>SA</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Stock<span style={{ color: "#60a5fa" }}>Auction</span></span>
        </div>
        <div style={{ fontSize: 12, color: "#475569" }}>Built with React · Node.js · PostgreSQL · ACID transactions</div>
      </footer>

      <style>{`
        @keyframes livePulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.5; transform:scale(1.4); }
        }
      `}</style>
    </div>
  );
}
