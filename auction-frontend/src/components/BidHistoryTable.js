import React from "react";

export default function BidHistoryTable({ bids, currentUserBidder }) {
  if (!bids || bids.length === 0) {
    return (
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 32,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>No bids placed yet</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Be the first to bid on this auction.</div>
      </div>
    );
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" });

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Bid History</span>
          <span style={{
            background: "rgba(53,116,240,0.1)",
            color: "var(--accent)",
            fontSize: 11, fontWeight: 600,
            padding: "1px 6px", borderRadius: 4,
          }}>{bids.length}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Auto-refresh: 3s</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Investor</th>
              <th>Bid Price</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid, index) => {
              const isHighest = bid.status === "highest" || bid.status === "winner";
              const isCurrentUser = bid.bidder === currentUserBidder;

              return (
                <tr key={bid.id} className={isHighest ? "highest-bidder" : ""}>
                  <td style={{ color: "var(--text-muted)", fontSize: 11 }}>{index + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 4,
                        background: isCurrentUser ? "var(--accent)" : "var(--bg-surface)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: isCurrentUser ? "#fff" : "var(--text-muted)",
                        flexShrink: 0,
                      }}>
                        {bid.bidder[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>
                          {isCurrentUser ? "You" : bid.bidder}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
                      color: isHighest ? "var(--green)" : "var(--text-primary)",
                    }}>
                      ₹{bid.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {bid.quantity.toLocaleString("en-IN")}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>
                    ₹{(bid.price * bid.quantity).toLocaleString("en-IN")}
                  </td>
                  <td>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{formatTime(bid.time)}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatDate(bid.time)}</div>
                  </td>
                  <td>
                    <span className={isHighest ? "badge-open" : "badge-closed"}>
                      {bid.status === "winner" ? "WINNER" : isHighest ? "HIGHEST" : "OUTBID"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
