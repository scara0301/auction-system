import React, { useState, useEffect } from "react";
import { fetchTransactions } from "../services/api";

const ROW_COLORS = ["#3574f0","#22c55e","#a78bfa","#f59e0b","#ef4444","#22d3ee","#ec4899","#84cc16"];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchTransactions();
        setTransactions(res.data);
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const total           = transactions.reduce((s, t) => s + parseFloat(t.total_amount), 0);
  const uniqueCompanies = new Set(transactions.map((t) => t.ticker)).size;

  const formatDay  = (iso) => new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  const formatTime = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  if (loading) return (
    <div className="page-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" }}>LOADING TRANSACTIONS...</div>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>
          Transaction History
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Share allocations received from closed auctions
        </p>
      </div>

      {transactions.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
            No transactions yet
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Win an auction to see share allocations here
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Transactions", value: transactions.length,                                                           icon: "🔄", color: "var(--accent)",  bg: "var(--accent-dim)" },
              { label: "Companies",          value: uniqueCompanies,                                                               icon: "🏢", color: "var(--purple)", bg: "var(--purple-dim)" },
              { label: "Total Invested",     value: `₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,            icon: "💎", color: "var(--green)",  bg: "var(--green-dim)" },
            ].map((s) => (
              <div key={s.label} className="stat-card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: s.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 19, flexShrink: 0,
                }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>
                    {s.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)", overflow: "hidden",
          }}>
            {/* Table header bar */}
            <div style={{
              background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
              padding: "10px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span className="terminal-label">All Allocations</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>
                {transactions.length} records
              </span>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th style={{ textAlign: "right" }}>Shares</th>
                  <th style={{ textAlign: "right" }}>Price / Share</th>
                  <th style={{ textAlign: "right" }}>Total Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => {
                  const color = ROW_COLORS[i % ROW_COLORS.length];
                  return (
                    <tr key={t.transaction_id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: color + "20", border: `1px solid ${color}44`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800, color: color, flexShrink: 0,
                          }}>
                            {t.company_name?.[0] || "?"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                              {t.company_name}
                            </div>
                            <span className="ticker-tag">{t.ticker}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                          {parseInt(t.quantity).toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>shares</div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                          ₹{parseFloat(t.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 800, color: "var(--green)" }}>
                          ₹{parseFloat(t.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                          {formatDay(t.transaction_date)}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {formatTime(t.transaction_date)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Total footer */}
            <div style={{
              background: "var(--bg-secondary)", borderTop: "1px solid var(--border)",
              padding: "12px 16px",
              display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Total Invested
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 800, color: "var(--green)" }}>
                ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
