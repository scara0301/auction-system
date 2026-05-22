import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWatchlist, removeFromWatchlist } from "../services/api";
import { useToast } from "../context/AppContext";
import { sectorImage } from "../utils/images";
import ConfirmDialog from "../components/ConfirmDialog";

const IconStar = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

function WatchlistCard({ item, onRemove }) {
  const navigate  = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered]   = useState(false);
  const [removing, setRemoving] = useState(false);
  const imgUrl = sectorImage(item.sector, 600, 160);

  const handleRemove = async (e) => {
    e.stopPropagation();
    setRemoving(true);
    await onRemove(item.stock_id);
    setRemoving(false);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${hovered ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
      }}
      onClick={() => navigate(`/auctions`)}
    >
      {/* Banner */}
      <div style={{ position: "relative", height: 110, overflow: "hidden" }}>
        {!imgError ? (
          <img
            src={imgUrl}
            alt={item.sector}
            onError={() => setImgError(true)}
            style={{
              width: "100%", height: "100%", objectFit: "cover", display: "block",
              transform: hovered ? "scale(1.04)" : "scale(1)",
              transition: "transform 0.4s ease",
            }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1e293b, #334155)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.68) 100%)" }} />

        {/* Company identity */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 12px", display: "flex", alignItems: "flex-end", gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
          }}>
            {item.logo_letter || item.company_name?.[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.company_name}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)" }}>
              {item.ticker} · {item.sector}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px" }}>
        {/* Price + shares */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
              Base Price
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              ₹{parseFloat(item.base_price).toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>
              Total Shares
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
              {parseInt(item.total_shares).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-outline"
            disabled={removing}
            onClick={handleRemove}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", fontSize: 11, fontWeight: 700,
              color: removing ? "var(--text-muted)" : "var(--red)",
              borderColor: "rgba(220,38,38,0.3)",
            }}
          >
            <IconStar filled />
            {removing ? "Removing…" : "Unwatch"}
          </button>
          <button
            className="btn-primary"
            onClick={(e) => { e.stopPropagation(); navigate("/auctions"); }}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 12px", fontSize: 11, fontWeight: 700 }}
          >
            View Auctions <IconArrow />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Watchlist() {
  const { addToast } = useToast();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null); // stockId to remove

  const load = useCallback(async () => {
    try {
      const res = await fetchWatchlist();
      setItems(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (stockId) => {
    try {
      await removeFromWatchlist(stockId);
      setItems((prev) => prev.filter((i) => i.stock_id !== stockId));
      addToast("Removed from watchlist.", "success");
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to remove.", "error");
    }
  };

  return (
    <div className="page-wrapper">
      {confirm && (
        <ConfirmDialog
          message="Remove this stock from your watchlist?"
          confirmLabel="Remove"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { handleRemove(confirm); setConfirm(null); }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 className="gradient-text gradient-text-sunset" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Watchlist
          </h1>
          {items.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
              background: "var(--accent-dim)", color: "var(--accent)",
              border: "1px solid rgba(37,99,235,0.2)",
              borderRadius: 20, padding: "2px 10px",
            }}>
              {items.length} stock{items.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Stocks you're following — add them from auction or portfolio pages
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80 }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" }}>LOADING WATCHLIST...</div>
        </div>
      ) : items.length === 0 ? (
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
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
            Your watchlist is empty
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
            Star stocks from the Auctions or Portfolio pages to track them here
          </div>
        </div>
      ) : (
        <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {items.map((item) => (
            <WatchlistCard
              key={item.stock_id}
              item={item}
              onRemove={(id) => setConfirm(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
