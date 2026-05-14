import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuctions } from "../services/api";
import AuctionCard from "../components/AuctionCard";

const ACCENT_COLORS = ["#3574f0","#22c55e","#a78bfa","#f59e0b","#ef4444","#22d3ee"];

export default function Home() {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");

  const loadAuctions = useCallback(async () => {
    try {
      const res = await fetchAuctions();
      setAuctions(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuctions();
    let interval = setInterval(loadAuctions, 3000);
    const onVisibility = () => {
      if (document.hidden) { clearInterval(interval); }
      else { loadAuctions(); interval = setInterval(loadAuctions, 3000); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, [loadAuctions]);

  const liveAuctions = auctions.filter((a) => a.status === "open");
  const totalBids    = auctions.reduce((s, a) => s + (a.bidCount || 0), 0);
  const volume       = auctions.reduce((s, a) => s + a.currentHighestBid * (a.totalShares - a.remainingShares), 0);
  const filtered     = filter === "all" ? auctions : auctions.filter((a) => a.status === filter);
  const topBidders   = [...auctions]
    .filter((a) => a.status === "open" && a.bidCount > 0)
    .sort((a, b) => b.currentHighestBid - a.currentHighestBid)
    .slice(0, 5);

  const stats = [
    {
      label: "Total Volume",
      value: `₹${(volume / 1e7).toFixed(2)} Cr`,
      sub: "across all auctions",
      color: "var(--accent)",
      bg: "rgba(37,99,235,0.08)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
        </svg>
      ),
    },
    {
      label: "Live Auctions",
      value: liveAuctions.length,
      sub: "currently open",
      color: "var(--green)",
      bg: "rgba(22,163,74,0.08)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="2"/>
          <path d="M16.24 7.76a6 6 0 010 8.49M7.76 16.24a6 6 0 010-8.49"/>
          <path d="M20.49 3.51a12 12 0 010 16.97M3.51 20.49a12 12 0 010-16.97"/>
        </svg>
      ),
    },
    {
      label: "Total Bids",
      value: totalBids.toLocaleString(),
      sub: "all time",
      color: "var(--yellow)",
      bg: "rgba(217,119,6,0.08)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2L20 8M11 5L19 13M3 21l7-7M14 8l-9 9a2 2 0 102.83 2.83L17 11"/>
        </svg>
      ),
    },
    {
      label: "Total Listings",
      value: auctions.length,
      sub: "all instruments",
      color: "var(--purple)",
      bg: "rgba(139,92,246,0.08)",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: "-0.02em" }}>
          Market Overview
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Live auction activity · updates every 3s
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card" style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: s.bg, color: s.color, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: s.color, lineHeight: 1, marginBottom: 4 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main area: auction grid + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20, alignItems: "start" }}>

        {/* Left: auction grid */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 1, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, padding: 3 }}>
              {[
                { key: "all",      label: "All" },
                { key: "open",     label: "Live" },
                { key: "upcoming", label: "Upcoming" },
                { key: "closed",   label: "Closed" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: "5px 14px", border: "none", cursor: "pointer", borderRadius: 4,
                    fontSize: 12, fontWeight: 600,
                    background: filter === f.key ? "var(--accent)" : "transparent",
                    color: filter === f.key ? "#fff" : "var(--text-muted)",
                    transition: "background 0.12s, color 0.12s",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div className="spinner" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" }}>LOADING...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60,
              background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12,
              color: "var(--text-muted)", fontSize: 13,
            }}>
              No auctions in this category
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {filtered.map((a) => (
                <AuctionCard key={a.id} auction={a} />
              ))}
            </div>
          )}
        </div>

        {/* Right: side panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Market pulse */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              Market Pulse
            </div>
            {[
              { label: "Open",     count: auctions.filter(a => a.status === "open").length,     color: "var(--green)" },
              { label: "Upcoming", count: auctions.filter(a => a.status === "upcoming").length, color: "var(--yellow)" },
              { label: "Closed",   count: auctions.filter(a => a.status === "closed").length,   color: "var(--text-muted)" },
            ].map((row) => {
              const pct = auctions.length ? Math.round((row.count / auctions.length) * 100) : 0;
              return (
                <div key={row.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: row.color, fontWeight: 600 }}>{row.count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: row.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top active */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              Top Active
            </div>
            {topBidders.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>
                No live auctions
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {topBidders.map((a, i) => {
                  const chg   = ((a.currentHighestBid - a.basePrice) / a.basePrice) * 100;
                  const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
                  return (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/auction/${a.id}`)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderRadius: 8, cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-secondary)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <div style={{
                        width: 26, height: 26, borderRadius: 7,
                        background: color + "18", border: `1px solid ${color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color, flexShrink: 0,
                      }}>
                        {a.company?.[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.company}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          ₹{a.currentHighestBid.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: chg >= 0 ? "var(--green)" : "var(--red)" }}>
                        {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Quick Stats
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                {
                  label: "Avg Bid Price",
                  value: auctions.length ? `₹${Math.round(auctions.reduce((s, a) => s + a.currentHighestBid, 0) / auctions.length).toLocaleString("en-IN")}` : "—",
                },
                {
                  label: "Highest Single Bid",
                  value: auctions.length ? `₹${Math.max(...auctions.map(a => a.currentHighestBid)).toLocaleString("en-IN")}` : "—",
                },
                {
                  label: "Most Active",
                  value: auctions.length ? (auctions.reduce((top, a) => (a.bidCount || 0) > (top.bidCount || 0) ? a : top, auctions[0])?.company || "—") : "—",
                },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{row.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
