import React, { useState, useEffect } from "react";
import { fetchPortfolio } from "../services/api";
import { useAuth } from "../context/AppContext";

const HOLDING_COLORS = ["#3574f0","#22c55e","#a78bfa","#f59e0b","#ef4444","#22d3ee","#ec4899","#84cc16"];

const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h2M9 13h2M13 9h2M13 13h2M9 17h6"/>
  </svg>
);

const IconWallet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);

const IconTrendUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IconTrendDown = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
  </svg>
);

const IconBarChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

export default function Portfolio() {
  const { user }     = useAuth();
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("cards");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchPortfolio();
        setPortfolio(res.data);
      } catch {
        // empty
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const totalInvested     = portfolio.reduce((s, p) => s + p.totalInvestment, 0);
  const totalCurrentValue = portfolio.reduce((s, p) => s + p.currentPrice * p.quantity, 0);
  const totalGain         = totalCurrentValue - totalInvested;
  const gainPercent       = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const gainUp            = totalGain >= 0;

  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

  if (loading) return (
    <div className="page-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto 12px" }} />
        <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em" }}>LOADING PORTFOLIO...</div>
      </div>
    </div>
  );

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="gradient-text gradient-text-candy" style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Portfolio</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Holdings allocated from closed auctions</p>
        </div>
        {portfolio.length > 0 && (
          <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 3 }}>
            {[{ key: "cards", label: "Cards" }, { key: "table", label: "Table" }].map((v) => (
              <button key={v.key} onClick={() => setView(v.key)} style={{
                padding: "5px 14px", border: "none", borderRadius: 4, cursor: "pointer",
                fontSize: 12, fontWeight: 600,
                background: view === v.key ? "var(--accent)" : "transparent",
                color: view === v.key ? "#fff" : "var(--text-muted)",
              }}>
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {portfolio.length === 0 ? (
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
            <IconBarChart />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>No holdings yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Win auctions to see your allocated shares here</div>
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              {
                label: "Holdings", value: portfolio.length, sub: "companies",
                icon: <IconBuilding />, color: "var(--accent)", bg: "var(--accent-dim)",
              },
              {
                label: "Total Invested",
                value: `₹${totalInvested.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`,
                sub: "acquisition cost",
                icon: <IconWallet />, color: "var(--text-secondary)", bg: "var(--bg-secondary)",
              },
              {
                label: "Current Value",
                value: `₹${totalCurrentValue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}`,
                sub: "mark-to-market",
                icon: gainUp ? <IconTrendUp /> : <IconTrendDown />,
                color: gainUp ? "var(--green)" : "var(--red)",
                bg: gainUp ? "var(--green-dim)" : "var(--red-dim)",
              },
              {
                label: "Total P&L",
                value: `${gainUp ? "+" : ""}₹${Math.abs(totalGain).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`,
                sub: `${gainPercent >= 0 ? "+" : ""}${gainPercent.toFixed(2)}% overall`,
                icon: <IconBarChart />,
                color: gainUp ? "var(--green)" : "var(--red)",
                bg: gainUp ? "var(--green-dim)" : "var(--red-dim)",
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
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 3 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Composition bar ── */}
          {portfolio.length > 1 && (
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)", padding: "14px 18px", marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                Portfolio Composition
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 8, overflow: "hidden", gap: 1, marginBottom: 10 }}>
                {portfolio.map((h, i) => {
                  const pct = totalCurrentValue > 0 ? (h.currentPrice * h.quantity / totalCurrentValue) * 100 : 0;
                  return (
                    <div key={h.id} style={{
                      width: `${pct}%`, height: "100%",
                      background: HOLDING_COLORS[i % HOLDING_COLORS.length],
                      transition: "width 0.5s ease",
                    }} title={`${h.company}: ${pct.toFixed(1)}%`} />
                  );
                })}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
                {portfolio.map((h, i) => {
                  const pct = totalCurrentValue > 0 ? (h.currentPrice * h.quantity / totalCurrentValue) * 100 : 0;
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: HOLDING_COLORS[i % HOLDING_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{h.company}</span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{pct.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Cards view ── */}
          {view === "cards" && (
            <div className="stagger-children" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {portfolio.map((h, i) => {
                const currentValue  = h.currentPrice * h.quantity;
                const gain          = currentValue - h.totalInvestment;
                const gainPct       = (gain / h.totalInvestment) * 100;
                const isUp          = gain >= 0;
                const color         = HOLDING_COLORS[i % HOLDING_COLORS.length];
                const allocationPct = totalCurrentValue > 0 ? (currentValue / totalCurrentValue) * 100 : 0;

                return (
                  <div key={h.id} style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)", overflow: "hidden",
                    transition: "border-color 0.2s, transform 0.2s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = color + "44"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
                  >
                    <div style={{ height: 3, background: color }} />
                    <div style={{ padding: "14px 16px" }}>
                      {/* Company row */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: color + "20", border: `1px solid ${color}44`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 15, fontWeight: 800, color,
                          }}>
                            {h.logo || h.company?.[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 1 }}>{h.company}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span className="ticker-tag">{h.ticker}</span>
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{h.sector}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{
                          background: isUp ? "var(--green-dim)" : "var(--red-dim)",
                          border: `1px solid ${isUp ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                          borderRadius: "var(--radius-sm)", padding: "4px 10px", textAlign: "center",
                        }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: isUp ? "var(--green)" : "var(--red)" }}>
                            {isUp ? "+" : ""}{gainPct.toFixed(2)}%
                          </div>
                          <div style={{ fontSize: 9, color: isUp ? "var(--green)" : "var(--red)", opacity: 0.7, fontWeight: 600 }}>P&L</div>
                        </div>
                      </div>

                      {/* Price metrics grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                        {[
                          { label: "Avg Price",     value: `₹${h.avgPrice.toLocaleString("en-IN")}` },
                          { label: "Current Price", value: `₹${h.currentPrice.toLocaleString("en-IN")}`, color: "var(--accent)" },
                          { label: "Qty",           value: h.quantity.toLocaleString("en-IN") },
                          { label: "Current Value", value: `₹${currentValue.toLocaleString("en-IN")}`, color: isUp ? "var(--green)" : "var(--red)" },
                        ].map((m) => (
                          <div key={m.label} style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                              {m.label}
                            </div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: m.color || "var(--text-primary)" }}>
                              {m.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* P&L bar */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
                            P&L:{" "}
                            <span style={{ color: isUp ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}>
                              {isUp ? "+" : ""}₹{Math.abs(gain).toLocaleString("en-IN")}
                            </span>
                          </span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {allocationPct.toFixed(1)}% of portfolio
                          </span>
                        </div>
                        <div className="progress-bar" style={{ height: 4 }}>
                          <div className="progress-bar-fill" style={{
                            width: `${Math.min(100, Math.abs(gainPct))}%`,
                            background: isUp ? "var(--green)" : "var(--red)",
                          }} />
                        </div>
                      </div>

                      <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        Acquired {h.wonAt ? formatDate(h.wonAt) : "—"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Table view ── */}
          {view === "table" && (
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Sector</th>
                    <th style={{ textAlign: "right" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Avg Price</th>
                    <th style={{ textAlign: "right" }}>Current</th>
                    <th style={{ textAlign: "right" }}>Invested</th>
                    <th style={{ textAlign: "right" }}>Value</th>
                    <th style={{ textAlign: "right" }}>P&L</th>
                    <th>Acquired</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((h, i) => {
                    const currentValue = h.currentPrice * h.quantity;
                    const gain         = currentValue - h.totalInvestment;
                    const gainPct      = (gain / h.totalInvestment) * 100;
                    const isUp         = gain >= 0;
                    const color        = HOLDING_COLORS[i % HOLDING_COLORS.length];
                    return (
                      <tr key={h.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 8,
                              background: color + "20", border: `1px solid ${color}44`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 12, fontWeight: 800, color, flexShrink: 0,
                            }}>{h.logo || h.company?.[0]}</div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{h.company}</div>
                              <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{h.ticker}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{h.sector}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>{h.quantity.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>₹{h.avgPrice.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>₹{h.currentPrice.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>₹{h.totalInvestment.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>₹{currentValue.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: isUp ? "var(--green)" : "var(--red)" }}>
                            {isUp ? "+" : ""}₹{Math.abs(gain).toLocaleString("en-IN")}
                          </div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: isUp ? "var(--green)" : "var(--red)", opacity: 0.7 }}>
                            {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                          </div>
                        </td>
                        <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{h.wonAt ? formatDate(h.wonAt) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
