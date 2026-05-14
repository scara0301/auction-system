import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuctions, fetchAllBids, createAuction, closeAuction, openAuction } from "../services/api";
import { useToast } from "../context/AppContext";
import Timer from "../components/Timer";
import ConfirmDialog from "../components/ConfirmDialog";

const initialForm = {
  company: "", ticker: "", sector: "Technology", description: "",
  totalShares: "", basePrice: "", startTime: "", endTime: "", type: "stock",
};

const SECTORS = ["Technology","Finance","Healthcare","Energy","Consumer","Industrial","Real Estate","Utilities"];

export default function AdminPanel() {
  const { addToast } = useToast();
  const navigate     = useNavigate();

  const [auctions, setAuctions]   = useState([]);
  const [allBids, setAllBids]     = useState({});
  const [tab, setTab]             = useState("monitor");
  const [form, setForm]           = useState(initialForm);
  const [creating, setCreating]   = useState(false);
  const [closingId, setClosingId] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const [confirm, setConfirm]     = useState(null);

  const loadData = async () => {
    try {
      const [aRes, bRes] = await Promise.all([fetchAuctions(), fetchAllBids()]);
      setAuctions(aRes.data);
      setAllBids(bRes.data);
    } catch {
      // stale data stays visible
    }
  };

  useEffect(() => {
    loadData();
    let interval = setInterval(loadData, 3000);
    const onVisibility = () => {
      if (document.hidden) clearInterval(interval);
      else { loadData(); interval = setInterval(loadData, 3000); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createAuction({ ...form, totalShares: parseInt(form.totalShares), basePrice: parseFloat(form.basePrice) });
      addToast(`Auction created for ${form.company}`, "success");
      setForm(initialForm);
      setTab("monitor");
      loadData();
    } catch (err) {
      addToast(err.response?.data?.error || err.message || "Failed to create auction", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = (id, company) => {
    setConfirm({
      message: `Close the auction for ${company}? This will run share allocation and cannot be undone.`,
      confirmLabel: "Close Auction", danger: true,
      onCancel: () => setConfirm(null),
      onConfirm: async () => {
        setConfirm(null); setClosingId(id);
        try {
          await closeAuction(id);
          addToast(`Auction for ${company} closed.`, "success");
          loadData();
        } catch (err) {
          addToast(err.response?.data?.error || "Failed to close auction.", "error");
        } finally {
          setClosingId(null);
        }
      },
    });
  };

  const handleOpen = async (id, company) => {
    setOpeningId(id);
    try {
      await openAuction(id);
      addToast(`Auction for ${company} is now live.`, "success");
      loadData();
    } catch (err) {
      addToast(err.response?.data?.error || "Failed to open auction.", "error");
    } finally {
      setOpeningId(null);
    }
  };

  const totalBids  = Object.values(allBids).reduce((s, b) => s + b.length, 0);
  const liveCount  = auctions.filter((a) => a.status === "open").length;
  const totalVol   = auctions.reduce((s, a) => s + a.currentHighestBid * (a.totalShares - a.remainingShares), 0);
  const liveAuctions = auctions.filter((a) => a.status === "open");

  const TABS = [
    { key: "monitor", label: "Live Monitor", icon: "📡" },
    { key: "manage",  label: "Manage",       icon: "⚙️" },
    { key: "create",  label: "Create",       icon: "+" },
  ];

  return (
    <div className="page-wrapper">
      {confirm && <ConfirmDialog {...confirm} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Admin Panel</h1>
          {liveCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--green-dim)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "3px 10px" }}>
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green)" }}>{liveCount} LIVE</span>
            </div>
          )}
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Platform control — manage auctions, monitor bids, launch new listings</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Auctions", value: auctions.length, icon: "📊", color: "var(--accent)",   bg: "var(--accent-dim)" },
          { label: "Live Now",       value: liveCount,       icon: "🔴", color: "var(--green)",    bg: "var(--green-dim)" },
          { label: "Total Bids",     value: totalBids,       icon: "⚡", color: "var(--yellow)",   bg: "var(--yellow-dim)" },
          { label: "Total Volume",   value: `₹${(totalVol / 1e7).toFixed(2)} Cr`, icon: "💰", color: "var(--purple)", bg: "var(--purple-dim)" },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 3, marginBottom: 20, width: "fit-content" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "7px 18px", borderRadius: 4, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600,
            background: tab === t.key ? "var(--accent)" : "transparent",
            color: tab === t.key ? "#fff" : "var(--text-secondary)",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.12s",
          }}>
            <span style={{ fontSize: 13 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Monitor ── */}
      {tab === "monitor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {liveAuctions.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>No live auctions</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Open an upcoming auction or create a new one to start monitoring</div>
            </div>
          ) : liveAuctions.map((auction) => {
            const bids = allBids[auction.id] || [];
            const topBid = bids[0];
            const chg = ((auction.currentHighestBid - auction.basePrice) / auction.basePrice) * 100;

            return (
              <div key={auction.id} style={{ background: "var(--bg-card)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                {/* Card header */}
                <div style={{
                  background: "linear-gradient(135deg, #0d2e1a 0%, #0f1a10 100%)",
                  borderBottom: "1px solid rgba(34,197,94,0.15)",
                  padding: "14px 18px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 15, fontWeight: 800, color: "var(--green)",
                      }}>{auction.logo}</div>
                      <span className="live-dot" style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8 }} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{auction.company}</span>
                        <span className="ticker-tag">{auction.ticker}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {bids.length} bid{bids.length !== 1 ? "s" : ""} ·
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--green)", marginLeft: 4 }}>
                          ₹{auction.currentHighestBid.toLocaleString("en-IN")}
                        </span>
                        <span style={{ color: chg >= 0 ? "var(--green)" : "var(--red)", marginLeft: 6, fontWeight: 700 }}>
                          {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Timer endTime={auction.endTime} compact />
                    <button
                      className="btn-danger"
                      style={{ padding: "5px 12px", fontSize: 11 }}
                      onClick={() => handleClose(auction.id, auction.company)}
                      disabled={closingId === auction.id}
                    >
                      {closingId === auction.id ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span className="spinner-sm" /> Closing...
                        </span>
                      ) : "Close"}
                    </button>
                    <button
                      className="btn-outline"
                      style={{ padding: "5px 12px", fontSize: 11 }}
                      onClick={() => navigate(`/auction/${auction.id}`)}
                    >
                      View →
                    </button>
                  </div>
                </div>

                {/* Bid table */}
                {bids.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Bidder</th>
                        <th style={{ textAlign: "right" }}>Price</th>
                        <th style={{ textAlign: "right" }}>Qty</th>
                        <th style={{ textAlign: "right" }}>Total</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bids.slice(0, 6).map((bid, i) => (
                        <tr key={bid.id} className={bid.status === "highest" ? "highest-bidder" : ""}>
                          <td style={{ fontWeight: 700, fontSize: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {i === 0 && <span style={{ fontSize: 14 }}>🏆</span>}
                              {bid.bidder}
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: bid.status === "highest" ? "var(--green)" : "var(--text-primary)" }}>
                            ₹{bid.price.toLocaleString("en-IN")}
                          </td>
                          <td style={{ textAlign: "right", fontSize: 12, fontFamily: "var(--font-mono)" }}>{bid.quantity.toLocaleString("en-IN")}</td>
                          <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>₹{(bid.price * bid.quantity).toLocaleString("en-IN")}</td>
                          <td style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {new Date(bid.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td>
                            <span className={bid.status === "highest" ? "badge-open" : "badge-closed"}>
                              {bid.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    Waiting for first bid…
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Manage ── */}
      {tab === "manage" && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          <div style={{
            background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
            padding: "10px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span className="terminal-label">All Auctions ({auctions.length})</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Base Price</th>
                <th style={{ textAlign: "right" }}>Highest Bid</th>
                <th style={{ textAlign: "right" }}>Bids</th>
                <th>Timer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {auctions.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: "var(--accent-dim)", border: "1px solid var(--border-accent)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, color: "var(--accent)", flexShrink: 0,
                      }}>{a.logo}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>{a.company}</div>
                        <span className="ticker-tag">{a.ticker}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                      {a.type}
                    </span>
                  </td>
                  <td>
                    {a.status === "open" ? (
                      <span className="badge-open">LIVE</span>
                    ) : a.status === "upcoming" ? (
                      <span className="badge-upcoming">UPCOMING</span>
                    ) : (
                      <span className="badge-closed">CLOSED</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)" }}>₹{a.basePrice.toLocaleString("en-IN")}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>₹{a.currentHighestBid.toLocaleString("en-IN")}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>{(allBids[a.id] || []).length}</td>
                  <td><Timer endTime={a.endTime} compact /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn-outline" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => navigate(`/auction/${a.id}`)}>View</button>
                      {a.status === "upcoming" && (
                        <button className="btn-success" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => handleOpen(a.id, a.company)} disabled={openingId === a.id}>
                          {openingId === a.id ? <span className="spinner-sm" /> : "Open"}
                        </button>
                      )}
                      {a.status === "open" && (
                        <button className="btn-danger" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => handleClose(a.id, a.company)} disabled={closingId === a.id}>
                          {closingId === a.id ? <span className="spinner-sm" /> : "Close"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create ── */}
      {tab === "create" && (
        <div style={{ maxWidth: 680 }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", overflow: "hidden",
          }}>
            <div style={{
              background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)",
              padding: "14px 20px",
            }}>
              <div className="section-title">Create New Auction</div>
              <div className="section-sub">Launch a new stock or IPO listing</div>
            </div>

            <div style={{ padding: 24 }}>
              <form onSubmit={handleCreate}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Company Name</label>
                    <input className="input-field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. TechCorp Ltd." required />
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Ticker Symbol</label>
                    <input className="input-field" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder="e.g. TCRP" required style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Sector</label>
                    <select className="input-field" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>
                      {SECTORS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Type</label>
                    <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="stock">Stock</option>
                      <option value="ipo">IPO</option>
                    </select>
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Base Price (₹)</label>
                    <input className="input-field" type="number" step="0.50" min="1" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} placeholder="e.g. 1000" required style={{ fontFamily: "var(--font-mono)" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Total Shares</label>
                    <input className="input-field" type="number" min="1" value={form.totalShares} onChange={(e) => setForm({ ...form, totalShares: e.target.value })} placeholder="e.g. 500000" required style={{ fontFamily: "var(--font-mono)" }} />
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    {/* intentionally empty for visual balance */}
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">Description</label>
                  <textarea
                    className="input-field"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Company overview, business model, market opportunity…"
                    rows={3}
                    style={{ resize: "vertical", lineHeight: 1.6 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Start Time</label>
                    <input className="input-field" type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">End Time</label>
                    <input className="input-field" type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: "12px 20px", fontSize: 13, fontWeight: 700 }}
                    disabled={creating}
                  >
                    {creating ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                        <span className="spinner-sm" /> Creating...
                      </span>
                    ) : "Launch Auction →"}
                  </button>
                  <button
                    type="button"
                    className="btn-outline"
                    style={{ padding: "12px 20px", fontSize: 13 }}
                    onClick={() => setForm(initialForm)}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
