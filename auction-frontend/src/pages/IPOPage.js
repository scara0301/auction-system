import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuctions } from "../services/api";
import Timer from "../components/Timer";
import { sectorImage } from "../utils/images";

function IPOCard({ ipo, onClick }) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered]   = useState(false);

  const isLive  = ipo.status === "open";
  const soldPct = ipo.totalShares > 0
    ? ((ipo.totalShares - ipo.remainingShares) / ipo.totalShares) * 100
    : 0;
  const chg    = ((ipo.currentHighestBid - ipo.basePrice) / ipo.basePrice) * 100;
  const imgUrl = sectorImage(ipo.sector, 600, 160);

  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-IN", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="auction-card"
      style={{
        borderColor: hovered ? "rgba(37,99,235,0.3)" : undefined,
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "var(--shadow-md)" : undefined,
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
      }}
    >
      {/* ── Photo banner ── */}
      <div className="auction-card-banner">
        {!imgError ? (
          <img
            src={imgUrl}
            alt={ipo.sector}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1e293b, #334155)" }} />
        )}

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.72) 100%)",
        }} />

        {/* Status badge */}
        <div style={{ position: "absolute", top: 10, right: 12 }}>
          {isLive ? <span className="badge-open">LIVE</span>
            : ipo.status === "upcoming" ? <span className="badge-upcoming">UPCOMING</span>
            : <span className="badge-closed">CLOSED</span>}
        </div>

        {/* Company identity */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "10px 14px",
          display: "flex", alignItems: "flex-end", gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0,
          }}>
            {ipo.logo || ipo.company?.[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{ipo.company}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-mono)" }}>
              {ipo.ticker} · {ipo.sector}
            </div>
          </div>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700,
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.8)", padding: "2px 7px", borderRadius: 4,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            IPO
          </span>
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="auction-card-body">

        {/* Price band */}
        {ipo.priceBand && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Price Band
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                ₹{ipo.priceBand.min.toLocaleString("en-IN")}
              </span>
              <div style={{ flex: 1, position: "relative", height: 4, background: "var(--border)", borderRadius: 4 }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(0, ((ipo.currentHighestBid - ipo.priceBand.min) / (ipo.priceBand.max - ipo.priceBand.min)) * 100))}%`,
                  background: "rgba(37,99,235,0.35)", borderRadius: 4,
                }} />
                <div style={{
                  position: "absolute",
                  left: `${Math.min(100, Math.max(0, ((ipo.currentHighestBid - ipo.priceBand.min) / (ipo.priceBand.max - ipo.priceBand.min)) * 100))}%`,
                  top: "50%", transform: "translate(-50%,-50%)",
                  width: 10, height: 10, borderRadius: "50%",
                  background: "var(--accent)", boxShadow: "0 0 6px var(--accent)",
                }} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                ₹{ipo.priceBand.max.toLocaleString("en-IN")}
              </span>
            </div>
            <div style={{ textAlign: "center", marginTop: 5 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Current bid: </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>
                ₹{ipo.currentHighestBid.toLocaleString("en-IN")}
              </span>
              <span style={{ fontSize: 10, color: chg >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700, marginLeft: 6 }}>
                {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Total Shares", value: ipo.totalShares.toLocaleString("en-IN") },
            { label: "Available",    value: ipo.remainingShares.toLocaleString("en-IN") },
            { label: "Bids",         value: ipo.bidCount || 0 },
          ].map((s) => (
            <div key={s.label} style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", padding: "8px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Subscription */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subscription</span>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, color: soldPct > 70 ? "var(--green)" : "var(--text-muted)" }}>
              {soldPct.toFixed(0)}%
            </span>
          </div>
          <div className="progress-bar" style={{ height: 5 }}>
            <div className="progress-bar-fill" style={{
              width: `${soldPct}%`,
              background: soldPct > 80 ? "var(--green)" : "var(--accent)",
            }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {isLive ? (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Ends</span>
                <Timer endTime={ipo.endTime} compact />
              </span>
            ) : ipo.status === "upcoming" ? (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 9, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.06em" }}>Opens</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{formatDate(ipo.startTime)}</span>
              </span>
            ) : (
              <span style={{ fontFamily: "var(--font-mono)" }}>Auction ended</span>
            )}
          </div>
          <button
            className={isLive ? "btn-primary" : "btn-outline"}
            style={{ padding: "5px 14px", fontSize: 11, fontWeight: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            {isLive ? "Place Bid" : "View"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IPOPage() {
  const navigate = useNavigate();
  const [ipos, setIpos]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");

  const load = useCallback(async () => {
    try {
      const res = await fetchAuctions({ type: "ipo" });
      setIpos(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    const onVisibility = () => { if (document.hidden) clearInterval(interval); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, [load]);

  const filtered  = filter === "all" ? ipos : ipos.filter((i) => i.status === filter);
  const liveCount = ipos.filter((i) => i.status === "open").length;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>IPO Auctions</h1>
          {liveCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "var(--green-dim)", border: "1px solid rgba(22,163,74,0.25)",
              borderRadius: 20, padding: "3px 10px",
            }}>
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)" }}>{liveCount} LIVE</span>
            </div>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Bid on Initial Public Offerings — highest bids secure share allocations
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        background: "var(--accent-dim)", border: "1px solid rgba(37,99,235,0.18)",
        borderRadius: "var(--radius-md)", padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 24, fontSize: 13, color: "var(--accent)",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        Shares are allocated to the highest bidders when the auction closes. Partial allocation supported based on bid ranking.
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 3 }}>
          {[
            { key: "all",      label: "All",      count: ipos.length },
            { key: "open",     label: "Live",     count: ipos.filter(i => i.status === "open").length },
            { key: "upcoming", label: "Upcoming", count: ipos.filter(i => i.status === "upcoming").length },
            { key: "closed",   label: "Closed",   count: ipos.filter(i => i.status === "closed").length },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "5px 14px", border: "none", cursor: "pointer", borderRadius: 4,
              fontSize: 12, fontWeight: 600,
              background: filter === f.key ? "var(--accent)" : "transparent",
              color: filter === f.key ? "#fff" : "var(--text-muted)",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              {f.label}
              {f.count > 0 && (
                <span style={{
                  fontSize: 10, fontFamily: "var(--font-mono)",
                  background: filter === f.key ? "rgba(255,255,255,0.2)" : "var(--bg-secondary)",
                  color: filter === f.key ? "#fff" : "var(--text-muted)",
                  padding: "0 5px", borderRadius: 8,
                }}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {filtered.length} IPO{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" }}>LOADING IPOs...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No IPOs found</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Check back soon for new listings</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {filtered.map((ipo) => (
            <IPOCard key={ipo.id} ipo={ipo} onClick={() => navigate(`/auction/${ipo.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
