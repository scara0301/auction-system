import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AppContext";

const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconAuctions = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2L20 8M11 5L19 13M3 21l7-7M14 8l-9 9a2 2 0 102.83 2.83L17 11"/>
  </svg>
);
const IconIPO = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconPortfolio = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
  </svg>
);
const IconTransactions = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
  </svg>
);
const IconAdmin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const investorLinks = [
  { path: "/",            label: "Dashboard",     icon: <IconDashboard />,    exact: true },
  { path: "/auctions",   label: "Auctions",      icon: <IconAuctions /> },
  { path: "/ipo",        label: "IPO",           icon: <IconIPO /> },
  { path: "/portfolio",  label: "Portfolio",     icon: <IconPortfolio /> },
  { path: "/transactions", label: "Transactions", icon: <IconTransactions /> },
  { path: "/settings",   label: "Settings",      icon: <IconSettings /> },
];

const adminLinks = [
  { path: "/",       label: "Dashboard",   icon: <IconDashboard />, exact: true },
  { path: "/auctions", label: "Auctions", icon: <IconAuctions /> },
  { path: "/ipo",    label: "IPO",         icon: <IconIPO /> },
  { path: "/admin",  label: "Admin Panel", icon: <IconAdmin /> },
  { path: "/settings", label: "Settings",  icon: <IconSettings /> },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const links = isAdmin ? adminLinks : investorLinks;
  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo-mark">SA</div>
        <div className="sidebar-logo-text">
          <span style={{ color: "#e2e8f0", fontWeight: 700 }}>Stock</span>
          <span style={{ color: "var(--accent)" }}>Auction</span>
        </div>
      </div>

      {/* Section label */}
      <div className="sidebar-section-label">NAVIGATION</div>

      {/* Nav links */}
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            end={link.exact}
            className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            <span className="sidebar-link-label">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      {/* User card */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div
            className="sidebar-avatar"
            style={{ background: isAdmin ? "var(--yellow)" : "var(--accent)" }}
          >
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="sidebar-user-meta">
            <div className="sidebar-user-name">{user.name || user.username}</div>
            <div className="sidebar-user-role">{user.role.toUpperCase()}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout} title="Logout">
            <IconLogout />
          </button>
        </div>
      </div>
    </aside>
  );
}
