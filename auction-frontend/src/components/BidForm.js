import React, { useState, useMemo } from "react";
import { useToast } from "../context/AppContext";
import { placeBid } from "../services/api";

export default function BidForm({ auction, currentUser, onBidPlaced }) {
  const { addToast } = useToast();
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const minBid   = auction.currentHighestBid + 0.50;
  const isOpen   = auction.status === "open";
  const maxShares = auction.remainingShares;

  const numericPrice = parseFloat(price);
  const numericQty   = parseInt(quantity);
  const total = !isNaN(numericPrice) && !isNaN(numericQty) && numericPrice > 0 && numericQty > 0
    ? numericPrice * numericQty
    : null;

  const quickPrices = useMemo(() => [
    { label: "+₹0.50", value: (minBid).toFixed(2) },
    { label: "+1%",    value: (auction.currentHighestBid * 1.01).toFixed(2) },
    { label: "+5%",    value: (auction.currentHighestBid * 1.05).toFixed(2) },
  ], [minBid, auction.currentHighestBid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const bidPrice = parseFloat(price);
    const bidQty   = parseInt(quantity);

    if (!price || isNaN(bidPrice))             return setError("Enter a valid bid price.");
    if (!quantity || isNaN(bidQty) || bidQty < 1) return setError("Enter a valid quantity (min 1).");
    if (bidPrice < minBid)                     return setError(`Minimum bid: ₹${minBid.toFixed(2)}`);
    if (bidQty > maxShares)                    return setError(`Max available: ${maxShares.toLocaleString("en-IN")} shares.`);

    setLoading(true);
    try {
      await placeBid(auction.id, { price: bidPrice, quantity: bidQty, bidder: currentUser?.username });
      addToast(`Bid placed: ₹${bidPrice.toLocaleString("en-IN")} × ${bidQty.toLocaleString("en-IN")} shares`, "success");
      setPrice("");
      setQuantity("");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2500);
      if (onBidPlaced) onBidPlaced();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to place bid.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span className="terminal-label">Place Bid</span>
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          min ₹{minBid.toFixed(2)}
        </span>
      </div>

      <div style={{ padding: 14 }}>
        {/* Closed state */}
        {!isOpen && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            Bidding is {auction.status === "closed" ? "closed" : "not yet open"}.
          </div>
        )}

        {/* Success flash */}
        {submitted && (
          <div className="alert alert-success" style={{ marginBottom: 12, animation: "fadeInUp 0.2s ease" }}>
            ✓ Bid submitted successfully
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Price */}
          <div className="form-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <label className="form-label" style={{ margin: 0 }}>Bid Price (₹)</label>
              <div style={{ display: "flex", gap: 4 }}>
                {quickPrices.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => { setPrice(q.value); setError(""); }}
                    disabled={!isOpen}
                    style={{
                      padding: "2px 7px",
                      fontSize: 10, fontWeight: 700,
                      background: price === q.value ? "var(--accent-dim)" : "var(--bg-secondary)",
                      border: `1px solid ${price === q.value ? "var(--border-accent)" : "var(--border)"}`,
                      borderRadius: 4, cursor: "pointer",
                      color: price === q.value ? "var(--accent)" : "var(--text-muted)",
                      transition: "all 0.12s",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              className="input-field"
              type="number"
              step="0.50"
              min={minBid}
              value={price}
              onChange={(e) => { setPrice(e.target.value); setError(""); }}
              placeholder={minBid.toFixed(2)}
              disabled={!isOpen || loading}
              style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600 }}
            />
          </div>

          {/* Quantity */}
          <div className="form-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <label className="form-label" style={{ margin: 0 }}>Quantity</label>
              <button
                type="button"
                onClick={() => { setQuantity(String(maxShares)); setError(""); }}
                disabled={!isOpen || maxShares === 0}
                style={{
                  padding: "2px 7px", fontSize: 10, fontWeight: 700,
                  background: "var(--bg-secondary)", border: "1px solid var(--border)",
                  borderRadius: 4, cursor: "pointer", color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                MAX
              </button>
            </div>
            <input
              className="input-field"
              type="number"
              min={1}
              max={maxShares}
              value={quantity}
              onChange={(e) => { setQuantity(e.target.value); setError(""); }}
              placeholder={`1 – ${maxShares.toLocaleString("en-IN")}`}
              disabled={!isOpen || loading}
              style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600 }}
            />
          </div>

          {/* Total display */}
          {total !== null && (
            <div style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-accent)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 12px",
              marginBottom: 12,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              animation: "fadeInUp 0.15s ease",
            }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Total Investment
              </span>
              <span style={{
                fontSize: 18, fontWeight: 800, color: "var(--accent)",
                fontFamily: "var(--font-mono)", letterSpacing: "-0.02em",
              }}>
                ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 12, fontSize: 12 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isOpen || loading}
            style={{
              width: "100%",
              padding: "11px 20px",
              fontSize: 13, fontWeight: 700,
              border: "none", borderRadius: "var(--radius-sm)",
              cursor: !isOpen || loading ? "not-allowed" : "pointer",
              background: !isOpen
                ? "var(--bg-secondary)"
                : loading
                ? "var(--accent)"
                : "linear-gradient(135deg, var(--accent) 0%, #5a8ef8 100%)",
              color: !isOpen ? "var(--text-muted)" : "#fff",
              letterSpacing: "0.04em",
              transition: "all 0.15s",
              boxShadow: !isOpen || loading ? "none" : "0 4px 16px var(--accent-glow)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {loading ? (
              <>
                <span className="spinner-sm" />
                Submitting...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                </svg>
                PLACE BID
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
