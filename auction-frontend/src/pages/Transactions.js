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
        <h1 className="gradient-text gradient-text-sunset" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>
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
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: "var(--bg-secondary)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px", color: "var(--text-muted)",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
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
              {
                label: "Total Transactions",
                value: transactions.length,
                color: "var(--accent)",
                bg: "var(--accent-dim)",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                  </svg>
                ),
              },
              {
                label: "Companies",
                value: uniqueCompanies,
                color: "var(--purple)",
                bg: "var(--purple-dim)",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M9 9h2M9 13h2M13 9h2M13 13h2M9 17h6"/>
                  </svg>
                ),
              },
              {
                label: "Total Invested",
                value: `₹${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
                color: "var(--green)",
                bg: "var(--green-dim)",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                  </svg>
                ),
              },
            ].map((s) => (
              <div key={s.label} className="stat-card" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: s.bg, color: s.color, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {s.icon}
                </div>
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
                            fontSize: 13, fontWeight: 800, color, flexShrink: 0,
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
