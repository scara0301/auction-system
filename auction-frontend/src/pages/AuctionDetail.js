import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAuctionById, fetchBids, closeAuction } from "../services/api";
import { useAuth, useToast } from "../context/AppContext";
import Timer from "../components/Timer";
import BidForm from "../components/BidForm";
import ConfirmDialog from "../components/ConfirmDialog";

function maskName(name) {
  if (!name || name.length < 2) return "***";
  return name[0] + name.slice(1).replace(/./g, "*").slice(0, 3);
}

const STATUS = {
  open:     { color: "var(--green)",   label: "LIVE",     glow: "var(--green-glow)" },
  upcoming: { color: "var(--yellow)",  label: "UPCOMING", glow: "rgba(245,158,11,0.2)" },
  closed:   { color: "var(--text-muted)", label: "CLOSED", glow: "none" },
};

export default function AuctionDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { addToast }      = useToast();

  const [auction, setAuction]   = useState(null);
  const [bids, setBids]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [closingAuction, setClosingAuction] = useState(false);
  const [confirm, setConfirm]   = useState(null);

  const myBidder       = user?.username || "";
  const myBid          = myBidder ? bids.find((b) => b.bidder === myBidder) : null;
  const isHighestBidder = myBid?.status === "highest";

  const loadData = useCallback(async () => {
    try {
      const [aRes, bRes] = await Promise.all([fetchAuctionById(id), fetchBids(id)]);
      setAuction(aRes.data);
      setBids(bRes.data);
    } catch {
      addToast("Failed to load auction", "error");
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    loadData();
    let interval = setInterval(loadData, 3000);
    const onVisibility = () => {
      if (document.hidden) clearInterval(interval);
      else { loadData(); interval = setInterval(loadData, 3000); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, [loadData]);

  const handleCloseAuction = () => {
    setConfirm({
      message: "Close this auction and run share allocation? This cannot be undone.",
      confirmLabel: "Close & Allocate",
      danger: true,
      onCancel: () => setConfirm(null),
      onConfirm: async () => {
        setConfirm(null);
        setClosingAuction(true);
        try {
          await closeAuction(id);
          addToast("Auction closed — shares allocated.", "success");
          loadData();
        } catch {
          addToast("Failed to close auction.", "error");
        } finally {
          setClosingAuction(false);
        }
      },
    });
  };

  if (loading) return (
    <div className="page-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" }}>LOADING AUCTION...</div>
      </div>
    </div>
  );

  if (!auction) return (
    <div className="page-wrapper" style={{ textAlign: "center", padding: 80 }}>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Auction not found</div>
      <button className="btn-outline" onClick={() => navigate("/")}>← Back to Market</button>
    </div>
  );

  const st         = STATUS[auction.status] || STATUS.closed;
  const fillPct    = auction.totalShares > 0 ? ((auction.totalShares - auction.remainingShares) / auction.totalShares) * 100 : 0;
  const chg        = ((auction.currentHighestBid - auction.basePrice) / auction.basePrice) * 100;
  const chgUp      = chg >= 0;
  const maxBidPrice = bids.length > 0 ? Math.max(...bids.map((b) => b.price)) : auction.currentHighestBid;

  return (
    <div className="page-wrapper" style={{ padding: "20px 24px" }}>
      {confirm && <ConfirmDialog {...confirm} />}

      {/* ── Back ── */}
      <button onClick={() => navigate(-1)} style={{
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-muted)", fontSize: 12, marginBottom: 16,
        fontFamily: "var(--font-body)", display: "flex", alignItems: "center", gap: 5,
        padding: 0, transition: "color 0.15s",
      }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
      >
        ← Market Overview
      </button>

      {/* ── Hero header ── */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        marginBottom: 14,
        position: "relative", overflow: "hidden",
        borderLeft: `3px solid ${st.color}`,
      }}>
        {/* Glow bg */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 80% 50%, ${st.color}08 0%, transparent 60%)`,
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          {/* Left: identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: "var(--accent-dim)", border: "1px solid var(--border-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 800, color: "var(--accent)", flexShrink: 0,
            }}>
              {auction.logo || auction.company?.[0]}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                  {auction.company}
                </span>
                <span className="ticker-tag">{auction.ticker}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  color: "var(--text-muted)", letterSpacing: "0.1em",
                  background: "var(--bg-secondary)", border: "1px solid var(--border)",
                  padding: "2px 6px", borderRadius: 4,
                }}>
                  {auction.type}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{auction.sector}</span>
                {auction.status === "open" ? (
                  <span className="badge-open">LIVE</span>
                ) : auction.status === "upcoming" ? (
                  <span className="badge-upcoming">UPCOMING</span>
                ) : (
                  <span className="badge-closed">CLOSED</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: price + admin action */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 34, fontWeight: 800,
                color: "var(--text-primary)", letterSpacing: "-0.03em", lineHeight: 1,
              }}>
                ₹{auction.currentHighestBid.toLocaleString("en-IN")}
              </div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                color: chgUp ? "var(--green)" : "var(--red)", marginTop: 4,
              }}>
                {chgUp ? "▲" : "▼"} {Math.abs(chg).toFixed(2)}% vs base ₹{auction.basePrice.toLocaleString("en-IN")}
              </div>
            </div>
            {isAdmin && auction.status === "open" && (
              <button
                className="btn-danger"
                onClick={handleCloseAuction}
                disabled={closingAuction}
                style={{ fontSize: 12, padding: "8px 16px" }}
              >
                {closingAuction ? "Closing..." : "Close Auction"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bid status banner ── */}
      {myBid && (
        <div
          className={isHighestBidder ? "bid-status-highest" : "bid-status-outbid"}
          style={{ marginBottom: 14 }}
        >
          <span style={{ fontSize: 16 }}>{isHighestBidder ? "🏆" : "⚡"}</span>
          {isHighestBidder
            ? `You're leading at ₹${myBid.price.toLocaleString("en-IN")} × ${myBid.quantity.toLocaleString("en-IN")} shares`
            : `Outbid — your last bid: ₹${myBid.price.toLocaleString("en-IN")} · Current: ₹${auction.currentHighestBid.toLocaleString("en-IN")}`}
        </div>
      )}

      {/* ── Stats strip ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)", marginBottom: 14, overflow: "hidden",
      }}>
        {[
          { label: "Base Price",   value: `₹${auction.basePrice.toLocaleString("en-IN")}`,          color: "var(--text-secondary)" },
          { label: "Highest Bid",  value: `₹${auction.currentHighestBid.toLocaleString("en-IN")}`,  color: "var(--accent)" },
          { label: "Premium",      value: `${chgUp ? "+" : ""}${chg.toFixed(2)}%`,                  color: chgUp ? "var(--green)" : "var(--red)" },
          { label: "Total Shares", value: (auction.totalShares || 0).toLocaleString("en-IN"),        color: "var(--text-primary)" },
          { label: "Bids Placed",  value: bids.length,                                               color: "var(--text-primary)" },
        ].map((s, i) => (
          <div key={s.label} style={{
            padding: "12px 16px",
            borderRight: i < 4 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: s.color, letterSpacing: "-0.02em" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14, alignItems: "start" }}>

        {/* ── LEFT: Bid ladder + Info ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Bid ladder */}
          <div className="terminal-panel">
            <div className="terminal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {auction.status === "open" && <span className="live-dot" />}
                <span className="terminal-label">Bid Book</span>
              </div>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                {bids.length} bid{bids.length !== 1 ? "s" : ""}
              </span>
            </div>

            {bids.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No bids yet</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Be the first to place a bid</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-secondary)" }}>
                      {["Rank", "Bidder", "Price (₹)", "Qty", "Total (₹)", "Depth"].map((h, i) => (
                        <th key={h} style={{
                          padding: "8px 14px", fontSize: 9, fontWeight: 700,
                          letterSpacing: "0.1em", textTransform: "uppercase",
                          color: "var(--text-muted)", textAlign: i >= 2 ? "right" : "left",
                          borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((bid, idx) => {
                      const isMe   = bid.bidder === myBidder;
                      const isTop  = idx === 0;
                      const depthPct = maxBidPrice > 0 ? (bid.price / maxBidPrice) * 100 : 0;
                      const rowBg  = isTop ? "rgba(34,197,94,0.04)" : isMe ? "rgba(53,116,240,0.04)" : "transparent";
                      const rowBorder = isTop ? "var(--green)" : isMe ? "var(--accent)" : "transparent";

                      return (
                        <tr
                          key={bid.id}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            borderLeft: `2px solid ${rowBorder}`,
                            background: rowBg,
                            transition: "background 0.2s",
                          }}
                        >
                          <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
                            {idx === 0 ? "🏆" : `#${idx + 1}`}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{
                                fontSize: 13, fontWeight: 700,
                                color: isMe ? "var(--accent)" : isTop ? "var(--green)" : "var(--text-primary)",
                                fontFamily: "var(--font-mono)",
                              }}>
                                {isMe ? user.username : maskName(bid.bidder)}
                              </span>
                              {isMe && <span className="you-badge">YOU</span>}
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            <span style={{
                              fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
                              color: isTop ? "var(--green)" : "var(--text-primary)",
                            }}>
                              {bid.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                            {bid.quantity.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                            {(bid.price * bid.quantity).toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "10px 14px", minWidth: 90 }}>
                            <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 3,
                                width: `${depthPct}%`,
                                background: isTop ? "var(--green)" : "var(--accent)",
                                opacity: 0.8,
                                transition: "width 0.5s ease",
                              }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* About panel */}
          <div className="terminal-panel">
            <div className="terminal-header">
              <span className="terminal-label">About {auction.company}</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.75, marginBottom: 14 }}>
                {auction.description}
              </p>

              {auction.priceBand && (
                <div style={{
                  background: "var(--bg-secondary)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)", padding: "12px 14px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 12,
                }}>
                  <span className="terminal-label">IPO Price Band</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 800, color: "var(--accent)" }}>
                    ₹{auction.priceBand.min.toLocaleString("en-IN")} – ₹{auction.priceBand.max.toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              {fillPct > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Subscription</span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, color: fillPct > 70 ? "var(--green)" : "var(--accent)" }}>
                      {fillPct.toFixed(1)}% filled
                    </span>
                  </div>
                  <div className="progress-bar" style={{ height: 5, borderRadius: 3 }}>
                    <div className="progress-bar-fill" style={{
                      width: `${fillPct}%`,
                      background: fillPct > 90 ? "var(--green)" : "var(--accent)",
                      borderRadius: 3,
                    }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Actions panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Timer */}
          <Timer endTime={auction.endTime} />

          {/* Bid form */}
          {user && !isAdmin && (
            <BidForm auction={auction} currentUser={user} onBidPlaced={loadData} />
          )}

          {/* Current leader */}
          {auction.highestBidder && (
            <div className="terminal-panel">
              <div className="terminal-header">
                <span className="terminal-label">Current Leader</span>
                {auction.status === "open" && <span className="live-dot" />}
              </div>
              <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "var(--green-dim)", border: "1px solid rgba(34,197,94,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 15, color: "var(--green)",
                }}>
                  {auction.highestBidder[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    {auction.highestBidder === myBidder ? "You" : maskName(auction.highestBidder)}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--green)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    ₹{auction.currentHighestBid.toLocaleString("en-IN")}/share
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auction details */}
          <div className="terminal-panel">
            <div className="terminal-header">
              <span className="terminal-label">Auction Details</span>
            </div>
            {[
              { label: "Status",    value: auction.status.toUpperCase() },
              { label: "Available", value: `${(auction.remainingShares || 0).toLocaleString("en-IN")} shares` },
              { label: "Opens",     value: new Date(auction.startTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) },
              { label: "Closes",    value: new Date(auction.endTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) },
            ].map((row, i, arr) => (
              <div key={row.label} className="meta-row" style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span className="meta-label">{row.label}</span>
                <span className="meta-value">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
