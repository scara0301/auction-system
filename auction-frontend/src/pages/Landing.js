import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ── Slideshow images (stock market / auction / finance) ─── */
const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop&q=85&auto=format",
    caption: "Live Stock Auctions", sub: "Real-time price discovery",
  },
  {
    url: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800&h=600&fit=crop&q=85&auto=format",
    caption: "IPO Bidding Platform", sub: "Secure allocations at listing price",
  },
  {
    url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=600&fit=crop&q=85&auto=format",
    caption: "Portfolio Tracking", sub: "Watch your holdings grow",
  },
  {
    url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop&q=85&auto=format",
    caption: "Market Analysis", sub: "Data-driven investment decisions",
  },
  {
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&q=85&auto=format",
    caption: "Smart Bidding", sub: "Win allocations with precision",
  },
];

const BANNER_PHOTO = "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=1400&h=500&fit=crop&q=80&auto=format";

/* ── Fake price series ───────────────────────────────────── */
const PRICE_DATA = [
  880, 920, 895, 960, 940, 1010, 985, 1050, 1030, 1100,
  1075, 1140, 1115, 1185, 1160, 1240, 1210, 1290, 1265, 1350,
  1320, 1400, 1375, 1460, 1435, 1510, 1485, 1570, 1540, 1620,
];

/* ── Image Slideshow ─────────────────────────────────────── */
function Slideshow() {
  const [cur, setCur]   = useState(0);
  const [prev, setPrev] = useState(null);
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);

  const goTo = (idx) => {
    if (idx === cur || fading) return;
    setPrev(cur);
    setCur(idx);
    setFading(true);
    setTimeout(() => { setPrev(null); setFading(false); }, 700);
  };

  const next = () => goTo((cur + 1) % SLIDES.length);
  const prev_ = () => goTo((cur - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCur((c) => {
        const n = (c + 1) % SLIDES.length;
        setPrev(c); setFading(true);
        setTimeout(() => { setPrev(null); setFading(false); }, 700);
        return n;
      });
    }, 3800);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.22)", height: 480, userSelect: "none" }}>
      {/* Previous image (fading out) */}
      {prev !== null && (
        <img src={SLIDES[prev].url} alt="" style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
          opacity: fading ? 0 : 1, transition: "opacity 0.7s ease",
        }} />
      )}
      {/* Current image (fading in) */}
      <img src={SLIDES[cur].url} alt={SLIDES[cur].caption} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
        opacity: fading ? 0.3 : 1, transition: "opacity 0.7s ease",
      }} />

      {/* Gradient overlays */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.65) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, transparent 60%)" }} />

      {/* Caption */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "28px 24px" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          {SLIDES[cur].caption}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
          {SLIDES[cur].sub}
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ position: "absolute", bottom: 20, right: 20, display: "flex", gap: 6 }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
            width: cur === i ? 22 : 7, height: 7, borderRadius: 4, border: "none",
            background: cur === i ? "#fff" : "rgba(255,255,255,0.4)",
            cursor: "pointer", padding: 0,
            transition: "width 0.3s ease, background 0.3s ease",
          }} />
        ))}
      </div>

      {/* Arrow buttons */}
      {[
        { side: "left",  onClick: prev_, d: "M15 18l-6-6 6-6" },
        { side: "right", onClick: next,  d: "M9 18l6-6-6-6" },
      ].map((a) => (
        <button key={a.side} onClick={a.onClick} style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          [a.side]: 14,
          width: 36, height: 36, borderRadius: 10,
          background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: "#fff", padding: 0,
          transition: "background 0.15s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.32)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.18)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points={a.d} />
          </svg>
        </button>
      ))}

      {/* Floating bid badge */}
      <div style={{
        position: "absolute", top: 20, right: 20,
        background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)",
        borderRadius: 12, padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        animation: "float 3s ease-in-out infinite",
      }}>
        <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Top Bid</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", fontFamily: "monospace" }}>₹1,620</div>
        <div style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>▲ +84.09%</div>
      </div>

      {/* Slide counter */}
      <div style={{ position: "absolute", top: 20, left: 20, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#fff", fontWeight: 700, fontFamily: "monospace" }}>
        {String(cur + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
      </div>
    </div>
  );
}

/* ── Animated SVG line chart ─────────────────────────────── */
function AnimatedChart() {
  const lineRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);
  const W = 340, H = 160, PX = 14, PY = 12;
  const prices = PRICE_DATA, n = prices.length;
  const min = Math.min(...prices) - 40, max = Math.max(...prices) + 40;
  const cx = (i) => PX + (i / (n - 1)) * (W - 2 * PX);
  const cy = (p) => H - PY - ((p - min) / (max - min)) * (H - 2 * PY);
  const pts = prices.map((p, i) => [cx(i), cy(p)]);
  const smooth = (arr) => {
    let d = `M ${arr[0][0]} ${arr[0][1]}`;
    for (let i = 1; i < arr.length; i++) {
      const mx = (arr[i - 1][0] + arr[i][0]) / 2;
      d += ` C ${mx} ${arr[i - 1][1]}, ${mx} ${arr[i][1]}, ${arr[i][0]} ${arr[i][1]}`;
    }
    return d;
  };
  const lineD = smooth(pts);
  const areaD = `${lineD} L ${cx(n - 1)} ${H - PY} L ${cx(0)} ${H - PY} Z`;

  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 2.2s cubic-bezier(0.4,0,0.2,1) 0.2s";
      el.style.strokeDashoffset = "0";
      setTimeout(() => setReady(true), 2500);
    });
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" /><stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <filter id="glow2"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i} x1={PX} y1={PY + t * (H - 2 * PY)} x2={W - PX} y2={PY + t * (H - 2 * PY)} stroke="rgba(37,99,235,0.1)" strokeWidth="1" strokeDasharray="3,4" />
        ))}
        <path d={areaD} fill="url(#aG)" opacity={ready ? 1 : 0} style={{ transition: "opacity 0.5s ease 2.3s" }} />
        <path ref={lineRef} d={lineD} fill="none" stroke="url(#lG)" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow2)" />
        {ready && pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={hoverIdx === i ? 5 : 2.5} fill={hoverIdx === i ? "#2563eb" : "rgba(37,99,235,0.5)"} stroke="#fff" strokeWidth="1.5" style={{ cursor: "crosshair", transition: "r 0.12s" }}
            onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} />
        ))}
        {hoverIdx !== null && (
          <g>
            <line x1={pts[hoverIdx][0]} y1={PY} x2={pts[hoverIdx][0]} y2={H - PY} stroke="rgba(37,99,235,0.25)" strokeWidth="1" strokeDasharray="3,3" />
            <rect x={Math.min(pts[hoverIdx][0] - 34, W - 76)} y={pts[hoverIdx][1] - 26} width={68} height={18} rx={5} fill="#1e3a8a" />
            <text x={Math.min(pts[hoverIdx][0], W - 42)} y={pts[hoverIdx][1] - 13} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="monospace">
              ₹{prices[hoverIdx].toLocaleString("en-IN")}
            </text>
          </g>
        )}
        {ready && (
          <>
            <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="8" fill="rgba(37,99,235,0.15)">
              <animate attributeName="r" values="5;10;5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={pts[n - 1][0]} cy={pts[n - 1][1]} r="4" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
          </>
        )}
      </svg>
      <div style={{ position: "absolute", top: 0, right: 0, fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: "#16a34a", background: "rgba(22,163,74,0.1)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 6, padding: "2px 8px", opacity: ready ? 1 : 0, transition: "opacity 0.4s ease 2.6s" }}>
        ₹{prices[n - 1].toLocaleString("en-IN")} ▲ +84%
      </div>
    </div>
  );
}

/* ── Candlestick chart ───────────────────────────────────── */
function CandlestickChart() {
  const [vis, setVis] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const candles = [
    { o:70,c:90,h:95,l:65,bull:true }, { o:90,c:82,h:94,l:78,bull:false },
    { o:82,c:105,h:110,l:79,bull:true }, { o:105,c:98,h:108,l:92,bull:false },
    { o:98,c:125,h:130,l:95,bull:true }, { o:125,c:115,h:128,l:110,bull:false },
    { o:115,c:145,h:150,l:112,bull:true }, { o:145,c:132,h:148,l:128,bull:false },
    { o:132,c:160,h:165,l:129,bull:true }, { o:160,c:172,h:176,l:155,bull:true },
    { o:172,c:158,h:175,l:153,bull:false }, { o:158,c:185,h:190,l:155,bull:true },
  ];
  const H=140, W=300, PAD=10, maxP=195, minP=60;
  const sc = (p) => H - PAD - ((p - minP) / (maxP - minP)) * (H - 2*PAD);
  const cw = (W - 2*PAD) / candles.length;
  return (
    <div ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id="bull" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" /><stop offset="100%" stopColor="#22c55e" /></linearGradient>
          <linearGradient id="bear" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#dc2626" /><stop offset="100%" stopColor="#ef4444" /></linearGradient>
        </defs>
        {[0.25,0.5,0.75].map((t,i) => <line key={i} x1={PAD} y1={PAD+t*(H-2*PAD)} x2={W-PAD} y2={PAD+t*(H-2*PAD)} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />)}
        {candles.map((c, i) => {
          const x=PAD+i*cw+cw*0.15, bw=cw*0.7, top=Math.min(sc(c.o),sc(c.c)), bot=Math.max(sc(c.o),sc(c.c)), bh=Math.max(bot-top,2), mx=x+bw/2;
          return (
            <g key={i} style={{ opacity: vis?1:0, transform: vis?"scaleY(1)":"scaleY(0)", transformOrigin:`${mx}px ${H-PAD}px`, transition:`opacity 0.4s ease ${i*80}ms, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${i*80}ms` }}>
              <line x1={mx} y1={sc(c.h)} x2={mx} y2={sc(c.l)} stroke={c.bull?"#16a34a":"#dc2626"} strokeWidth="1.5" />
              <rect x={x} y={top} width={bw} height={bh} rx="2" fill={c.bull?"url(#bull)":"url(#bear)"} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Counter ─────────────────────────────────────────────── */
function Counter({ to, prefix="", suffix="", duration=1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = Date.now();
      const tick = () => { const p=Math.min((Date.now()-start)/duration,1), eased=1-Math.pow(1-p,3); setVal(Math.floor(eased*to)); if(p<1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to, duration]);
  return <span ref={ref}>{prefix}{val.toLocaleString("en-IN")}{suffix}</span>;
}

/* ── Icons ───────────────────────────────────────────────── */
const IcBolt     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IcChart    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IcShield   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcPie      = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>;
const IcCheck    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcArrow    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

const FEATURES = [
  { icon:<IcBolt />,  title:"Real-time Bidding",  desc:"Bid on live auctions refreshed every 3 seconds. Never miss a price move.",     color:"#2563eb", grad:"linear-gradient(135deg,#dbeafe,#eff6ff)", border:"rgba(37,99,235,0.2)" },
  { icon:<IcChart />, title:"IPO Access",          desc:"Participate in IPOs at price-discovery stage before market listing.",           color:"#16a34a", grad:"linear-gradient(135deg,#dcfce7,#f0fdf4)", border:"rgba(22,163,74,0.2)" },
  { icon:<IcPie />,   title:"Portfolio Tracking",  desc:"Holdings auto-appear post-allocation with weighted cost and live P&L.",         color:"#7c3aed", grad:"linear-gradient(135deg,#ede9fe,#f5f3ff)", border:"rgba(124,58,237,0.2)" },
  { icon:<IcShield />,title:"Secure Allocation",   desc:"One atomic ACID transaction — race-proof, every rupee perfectly accounted.",   color:"#d97706", grad:"linear-gradient(135deg,#fef3c7,#fffbeb)", border:"rgba(217,119,6,0.2)" },
];

const STEPS = [
  { num:"01", title:"Create Account", desc:"Sign up free in seconds. Your starting balance is set and you're ready to trade.", color:"#2563eb", grad:"linear-gradient(135deg,#2563eb,#3b82f6)" },
  { num:"02", title:"Browse & Bid",   desc:"Find a live auction. Beat the top bid by ₹0.50+ to take the lead.",               color:"#7c3aed", grad:"linear-gradient(135deg,#7c3aed,#a855f7)" },
  { num:"03", title:"Win & Hold",     desc:"When closed, top bidders get shares — appearing instantly in your portfolio.",    color:"#16a34a", grad:"linear-gradient(135deg,#16a34a,#22c55e)" },
];

const PERKS = [
  "Price-time priority allocation", "Atomic ACID transactions",
  "Live 3-second polling",          "JWT-secured auth",
  "Balance enforced at bid time",   "Watchlist & history",
];

/* ── Main ────────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const btn = (label, onClick, primary=true) => (
    <button onClick={onClick} style={{
      padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", borderRadius: 10,
      display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
      ...(primary
        ? { background: "linear-gradient(135deg,#2563eb,#3b82f6)", border: "none", color: "#fff", boxShadow: "0 6px 24px rgba(37,99,235,0.4)" }
        : { background: "#fff", border: "1px solid #e2e8f0", color: "#334155", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }),
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = primary ? "0 10px 32px rgba(37,99,235,0.5)" : "0 4px 16px rgba(37,99,235,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = primary ? "0 6px 24px rgba(37,99,235,0.4)" : "0 2px 8px rgba(0,0,0,0.06)"; }}
    >{label}{primary && <IcArrow />}</button>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#fff", fontFamily:"var(--font-body)", overflowX:"hidden" }}>

      {/* Animated background orbs */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
        {[
          { w:700, h:700, top:"-250px", left:"-150px",  c:"rgba(37,99,235,0.08)",   dur:"22s" },
          { w:550, h:550, top:"25%",    right:"-200px",  c:"rgba(124,58,237,0.07)",  dur:"28s", rev:true },
          { w:450, h:450, bottom:"5%",  left:"15%",      c:"rgba(22,163,74,0.06)",   dur:"19s", delay:"4s" },
          { w:350, h:350, top:"55%",    left:"55%",      c:"rgba(236,72,153,0.05)",  dur:"24s" },
        ].map((o, i) => (
          <div key={i} style={{ position:"absolute", width:o.w, height:o.h, borderRadius:"50%", background:`radial-gradient(circle, ${o.c} 0%, transparent 70%)`, top:o.top, left:o.left, right:o.right, bottom:o.bottom, animation:`auraDrift ${o.dur} ease-in-out infinite ${o.rev?"reverse":""} ${o.delay||""}` }} />
        ))}
      </div>

      {/* Navbar */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 40px", height:60, background:scrolled?"rgba(255,255,255,0.93)":"transparent", backdropFilter:scrolled?"blur(14px)":"none", borderBottom:scrolled?"1px solid rgba(0,0,0,0.07)":"none", transition:"all 0.3s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => window.scrollTo({top:0,behavior:"smooth"})}>
          <div style={{ width:34, height:34, borderRadius:8, background:"linear-gradient(135deg,#2563eb,#60a5fa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", boxShadow:"0 4px 14px rgba(37,99,235,0.35)" }}>SA</div>
          <span style={{ fontSize:16, fontWeight:800, color:"#0f172a", letterSpacing:"-0.02em" }}>Stock<span style={{ color:"#2563eb" }}>Auction</span></span>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={() => navigate("/login")} style={{ padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer", background:"transparent", border:"1px solid rgba(0,0,0,0.12)", borderRadius:8, color:"#334155", transition:"all 0.15s" }}
            onMouseEnter={(e)=>{e.currentTarget.style.borderColor="#2563eb";e.currentTarget.style.color="#2563eb";}}
            onMouseLeave={(e)=>{e.currentTarget.style.borderColor="rgba(0,0,0,0.12)";e.currentTarget.style.color="#334155";}}>
            Sign In
          </button>
          <button onClick={() => navigate("/register")} style={{ padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer", background:"linear-gradient(135deg,#2563eb,#3b82f6)", border:"none", borderRadius:8, color:"#fff", boxShadow:"0 4px 14px rgba(37,99,235,0.35)", transition:"all 0.15s" }}
            onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(37,99,235,0.45)";}}
            onMouseLeave={(e)=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 14px rgba(37,99,235,0.35)";}}>
            Get Started →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", alignItems:"center", padding:"88px 48px 60px", gap:48, flexWrap:"wrap" }}>
        {/* Left */}
        <div style={{ flex:"1 1 360px", maxWidth:520 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:7, background:"rgba(22,163,74,0.09)", border:"1px solid rgba(22,163,74,0.22)", borderRadius:20, padding:"5px 14px", marginBottom:24, animation:"popIn 0.5s ease backwards" }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"#16a34a", display:"inline-block", boxShadow:"0 0 6px #16a34a", animation:"livePulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize:12, fontWeight:700, color:"#16a34a", letterSpacing:"0.04em" }}>Live Auctions Running Now</span>
          </div>

          <h1 style={{ fontSize:"clamp(38px,6vw,70px)", fontWeight:900, lineHeight:1.08, letterSpacing:"-0.04em", color:"#0f172a", marginBottom:16, animation:"pageEnter 0.7s ease backwards 0.1s" }}>
            Bid Smart.<br />
            <span style={{ background:"linear-gradient(135deg,#2563eb 0%,#7c3aed 45%,#ec4899 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", backgroundSize:"200% 200%", animation:"gradientPan 4s ease-in-out infinite" }}>Win Shares.</span>
          </h1>

          <p style={{ fontSize:17, color:"#64748b", lineHeight:1.7, marginBottom:32, animation:"pageEnter 0.7s ease backwards 0.2s" }}>
            A real-time stock and IPO auction platform. Compete for share allocations through live price-discovery bidding — fair, fast, and fully transparent.
          </p>

          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:40, animation:"pageEnter 0.7s ease backwards 0.3s" }}>
            {btn("Start Bidding", () => navigate("/register"))}
            {btn("Sign In →", () => navigate("/login"), false)}
          </div>

          {/* Mini stats */}
          <div style={{ display:"flex", gap:28, flexWrap:"wrap", animation:"pageEnter 0.7s ease backwards 0.4s" }}>
            {[
              {v:"12+",    l:"Active Auctions", c:"#2563eb"},
              {v:"₹240Cr", l:"Total Volume",    c:"#7c3aed"},
              {v:"3,400+", l:"Investors",        c:"#16a34a"},
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontSize:24, fontWeight:900, color:s.c, fontFamily:"var(--font-mono)", letterSpacing:"-0.02em" }}>{s.v}</div>
                <div style={{ fontSize:11, color:"#94a3b8", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Slideshow */}
        <div style={{ flex:"1 1 360px", maxWidth:520, animation:"pageEnter 0.8s ease backwards 0.25s" }}>
          <Slideshow />

          {/* Live chart strip below slideshow */}
          <div style={{ marginTop:16, background:"#fff", border:"1px solid rgba(37,99,235,0.12)", borderRadius:16, padding:"14px 16px 10px", boxShadow:"0 4px 20px rgba(37,99,235,0.08)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em" }}>NovaTech Solutions · Live Bid Chart</span>
              <span style={{ fontSize:11, fontWeight:700, color:"#16a34a", fontFamily:"monospace" }}>LIVE ●</span>
            </div>
            <AnimatedChart />
          </div>
        </div>
      </section>

      {/* ── Colorful stats band ── */}
      <section style={{ position:"relative", zIndex:1, padding:"0 0 0 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[
            {l:"Active Auctions",  to:12,   sx:"+",   bg:"linear-gradient(135deg,#2563eb,#3b82f6)", shadow:"rgba(37,99,235,0.4)"},
            {l:"Total Volume",     to:240,  px:"₹",sx:" Cr", bg:"linear-gradient(135deg,#7c3aed,#a855f7)", shadow:"rgba(124,58,237,0.4)"},
            {l:"Investors",        to:3400, sx:"+",   bg:"linear-gradient(135deg,#16a34a,#22c55e)", shadow:"rgba(22,163,74,0.4)"},
            {l:"Shares Allocated", to:5,    sx:"M+",  bg:"linear-gradient(135deg,#d97706,#f59e0b)", shadow:"rgba(217,119,6,0.4)"},
          ].map((s) => (
            <div key={s.l} style={{ background:s.bg, padding:"32px 20px", textAlign:"center" }}>
              <div style={{ fontSize:"clamp(28px,3vw,42px)", fontWeight:900, color:"#fff", fontFamily:"var(--font-mono)", letterSpacing:"-0.03em", lineHeight:1 }}>
                <Counter to={s.to} prefix={s.px||""} suffix={s.sx||""} />
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", fontWeight:600, marginTop:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Photo banner ── */}
      <section style={{ position:"relative", zIndex:1, overflow:"hidden", height:280 }}>
        <img src={BANNER_PHOTO} alt="Trading" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(15,23,42,0.85) 0%,rgba(37,99,235,0.65) 100%)" }} />
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"0 24px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.6)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>Powered by real database engineering</div>
          <h2 style={{ fontSize:"clamp(20px,3.5vw,36px)", fontWeight:900, color:"#fff", letterSpacing:"-0.03em", lineHeight:1.2, maxWidth:620 }}>
            Every bid, allocation, and transaction runs inside a single ACID-compliant PostgreSQL transaction
          </h2>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{ position:"relative", zIndex:1, padding:"80px 48px", background:"linear-gradient(135deg,#f8fafc 0%,#eff6ff 50%,#f5f3ff 100%)" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div style={{ display:"inline-block", background:"linear-gradient(135deg,#2563eb,#3b82f6)", color:"#fff", fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", borderRadius:20, padding:"4px 14px", marginBottom:12 }}>Simple Process</div>
            <h2 style={{ fontSize:"clamp(26px,4vw,38px)", fontWeight:900, color:"#0f172a", letterSpacing:"-0.03em" }}>Three steps to your first allocation</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:20 }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ background:"#fff", border:"1px solid rgba(0,0,0,0.06)", borderRadius:18, padding:"28px 24px", boxShadow:"0 4px 20px rgba(0,0,0,0.06)", position:"relative", overflow:"hidden", transition:"transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow="0 20px 40px rgba(0,0,0,0.12)";}}
                onMouseLeave={(e)=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.06)";}}>
                <div style={{ position:"absolute", top:-10, right:14, fontSize:80, fontWeight:900, color:s.color, opacity:0.07, fontFamily:"var(--font-mono)", lineHeight:1, userSelect:"none" }}>{s.num}</div>
                <div style={{ width:44, height:44, borderRadius:12, background:s.grad, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, fontFamily:"var(--font-mono)", marginBottom:16 }}>{i+1}</div>
                <div style={{ fontSize:18, fontWeight:800, color:"#0f172a", marginBottom:8, letterSpacing:"-0.02em" }}>{s.title}</div>
                <div style={{ fontSize:14, color:"#64748b", lineHeight:1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features + candlestick ── */}
      <section style={{ position:"relative", zIndex:1, padding:"80px 48px", background:"#fff" }}>
        <div style={{ maxWidth:1060, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:48, alignItems:"center" }}>
          <div>
            <div style={{ display:"inline-block", background:"linear-gradient(135deg,#7c3aed,#a855f7)", color:"#fff", fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", borderRadius:20, padding:"4px 14px", marginBottom:12 }}>Platform Features</div>
            <h2 style={{ fontSize:"clamp(24px,4vw,36px)", fontWeight:900, color:"#0f172a", letterSpacing:"-0.03em", marginBottom:28 }}>Everything you need to trade</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{ background:f.grad, border:`1px solid ${f.border}`, borderRadius:16, padding:"18px 16px", transition:"transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 12px 30px ${f.border}`;}}
                  onMouseLeave={(e)=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
                  <div style={{ width:40, height:40, borderRadius:10, background:"rgba(255,255,255,0.7)", color:f.color, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:12, boxShadow:`0 4px 12px ${f.border}` }}>{f.icon}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#0f172a", marginBottom:6 }}>{f.title}</div>
                  <div style={{ fontSize:12, color:"#475569", lineHeight:1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a8a)", borderRadius:18, padding:"20px", boxShadow:"0 16px 48px rgba(15,23,42,0.3)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>Price Action · Live</div>
                <div style={{ display:"flex", gap:10 }}>
                  <span style={{ color:"#22c55e", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, background:"#22c55e", borderRadius:2, display:"inline-block" }} />Bull</span>
                  <span style={{ color:"#f87171", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, background:"#f87171", borderRadius:2, display:"inline-block" }} />Bear</span>
                </div>
              </div>
              <CandlestickChart />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                {l:"Bid Volume",    v:"₹4.2Cr",  c:"#2563eb", bg:"linear-gradient(135deg,#dbeafe,#eff6ff)"},
                {l:"Active Bids",   v:"247",      c:"#7c3aed", bg:"linear-gradient(135deg,#ede9fe,#f5f3ff)"},
                {l:"Avg Allocation",v:"₹1,284",  c:"#16a34a", bg:"linear-gradient(135deg,#dcfce7,#f0fdf4)"},
                {l:"Win Rate",      v:"68%",      c:"#d97706", bg:"linear-gradient(135deg,#fef3c7,#fffbeb)"},
              ].map((s) => (
                <div key={s.l} style={{ background:s.bg, borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{s.l}</div>
                  <div style={{ fontSize:20, fontWeight:900, color:s.c, fontFamily:"var(--font-mono)", letterSpacing:"-0.02em" }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Perks ── */}
      <section style={{ position:"relative", zIndex:1, padding:"60px 48px", background:"linear-gradient(135deg,#f8fafc,#fdf4ff)" }}>
        <div style={{ maxWidth:700, margin:"0 auto", textAlign:"center" }}>
          <h2 style={{ fontSize:"clamp(22px,4vw,32px)", fontWeight:900, color:"#0f172a", letterSpacing:"-0.03em", marginBottom:28 }}>Built on real database engineering</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:10 }}>
            {PERKS.map((p, i) => {
              const colors = ["#2563eb","#7c3aed","#16a34a","#d97706","#ec4899","#0891b2"];
              return (
                <div key={p} style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", border:`1px solid ${colors[i%colors.length]}22`, borderRadius:10, padding:"12px 14px", fontSize:13, fontWeight:600, color:"#334155" }}>
                  <span style={{ width:22, height:22, borderRadius:6, flexShrink:0, background:`${colors[i%colors.length]}15`, color:colors[i%colors.length], display:"flex", alignItems:"center", justifyContent:"center" }}><IcCheck /></span>
                  {p}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position:"relative", zIndex:1, padding:"80px 24px", background:"linear-gradient(135deg,#1e3a8a 0%,#2563eb 40%,#7c3aed 70%,#ec4899 100%)", textAlign:"center", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"rgba(255,255,255,0.05)", top:"-200px", right:"-100px" }} />
          <div style={{ position:"absolute", width:350, height:350, borderRadius:"50%", background:"rgba(255,255,255,0.04)", bottom:"-100px", left:"5%" }} />
        </div>
        <div style={{ position:"relative" }}>
          <h2 style={{ fontSize:"clamp(28px,5vw,46px)", fontWeight:900, color:"#fff", letterSpacing:"-0.03em", lineHeight:1.15, marginBottom:14 }}>Ready to place your first bid?</h2>
          <p style={{ fontSize:16, color:"rgba(255,255,255,0.72)", marginBottom:36, maxWidth:480, margin:"0 auto 36px" }}>Create a free account and start bidding on live auctions in under 2 minutes.</p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={() => navigate("/register")} style={{ padding:"14px 36px", fontSize:15, fontWeight:700, cursor:"pointer", background:"#fff", border:"none", borderRadius:10, color:"#2563eb", boxShadow:"0 6px 24px rgba(0,0,0,0.2)", transition:"all 0.2s", display:"flex", alignItems:"center", gap:8 }}
              onMouseEnter={(e)=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 10px 32px rgba(0,0,0,0.3)";}}
              onMouseLeave={(e)=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 6px 24px rgba(0,0,0,0.2)";}}>
              Create Free Account <IcArrow />
            </button>
            <button onClick={() => navigate("/login")} style={{ padding:"14px 36px", fontSize:15, fontWeight:600, cursor:"pointer", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:10, color:"#fff", backdropFilter:"blur(8px)", transition:"background 0.15s" }}
              onMouseEnter={(e)=>{e.currentTarget.style.background="rgba(255,255,255,0.22)";}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";}}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position:"relative", zIndex:1, padding:"24px 40px", background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:"linear-gradient(135deg,#2563eb,#60a5fa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff" }}>SA</div>
          <span style={{ fontSize:14, fontWeight:700, color:"#e2e8f0" }}>Stock<span style={{ color:"#60a5fa" }}>Auction</span></span>
        </div>
        <div style={{ fontSize:12, color:"#475569" }}>React · Node.js · PostgreSQL · ACID transactions</div>
      </footer>

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
      `}</style>
    </div>
  );
}
