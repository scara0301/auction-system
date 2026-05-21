import React, { useState, useEffect } from "react";
import AuctionCard from "../components/AuctionCard";
import { fetchAuctions } from "../services/api";

export default function Auctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [sortBy, setSortBy]     = useState("price_desc");
  const [filter, setFilter]     = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchAuctions();
        setAuctions(res.data);
      } catch {
        // keep stale data
      } finally {
        setLoading(false);
      }
    };
    load();
    let interval = setInterval(load, 3000);
    const onVisibility = () => {
      if (document.hidden) clearInterval(interval);
      else { load(); interval = setInterval(load, 3000); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  const filtered = auctions
    .filter((a) => {
      const matchSearch = !search ||
        a.company.toLowerCase().includes(search.toLowerCase()) ||
        a.ticker.toLowerCase().includes(search.toLowerCase()) ||
        a.sector.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || a.status === filter;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (sortBy === "price_desc") return b.currentHighestBid - a.currentHighestBid;
      if (sortBy === "price_asc")  return a.currentHighestBid - b.currentHighestBid;
      if (sortBy === "time_asc")   return new Date(a.endTime) - new Date(b.endTime);
      if (sortBy === "bids_desc")  return (b.bidCount || 0) - (a.bidCount || 0);
      if (sortBy === "company")    return a.company.localeCompare(b.company);
      return 0;
    });

  const liveCount = auctions.filter((a) => a.status === "open").length;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 className="gradient-text" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Auctions</h1>
            {liveCount > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "var(--green-dim)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 20, padding: "3px 10px",
              }}>
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)" }}>{liveCount} LIVE</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            All stock and IPO auctions · auto-refreshing every 3 seconds
          </p>
        </div>
      </div>

      {/* Controls bar */}
      <div style={{
        display: "flex", gap: 10, alignItems: "center",
        flexWrap: "wrap", marginBottom: 20,
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 380 }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, ticker, sector…"
            style={{ paddingLeft: 34 }}
          />
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 3 }}>
          {[
            { key: "all",      label: "All" },
            { key: "open",     label: "Live" },
            { key: "upcoming", label: "Soon" },
            { key: "closed",   label: "Closed" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "5px 12px", border: "none", cursor: "pointer", borderRadius: 4,
              fontSize: 12, fontWeight: 600,
              background: filter === f.key ? "var(--accent)" : "transparent",
              color: filter === f.key ? "#fff" : "var(--text-muted)",
              transition: "background 0.12s, color 0.12s",
            }}>{f.label}</button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input-field"
          style={{ width: "auto", minWidth: 160 }}
        >
          <option value="price_desc">Highest Bid ↓</option>
          <option value="price_asc">Lowest Bid ↑</option>
          <option value="bids_desc">Most Bids</option>
          <option value="time_asc">Ending Soonest</option>
          <option value="company">Company A–Z</option>
        </select>

        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" }}>LOADING MARKET DATA...</div>
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
            margin: "0 auto 12px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>No results found</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Try adjusting your search or filter</div>
          {search && (
            <button onClick={() => setSearch("")} className="btn-outline" style={{ marginTop: 14, padding: "6px 16px", fontSize: 12 }}>
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid-responsive stagger-children">
          {filtered.map((a) => <AuctionCard key={a.id} auction={a} />)}
        </div>
      )}
    </div>
  );
}
