import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AppContext";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = isAdmin
    ? [
        { path: "/", label: "Dashboard" },
        { path: "/auctions", label: "Auctions" },
        { path: "/ipo", label: "IPO" },
        { path: "/admin", label: "Admin" },
      ]
    : [
        { path: "/", label: "Home" },
        { path: "/auctions", label: "Auctions" },
        { path: "/ipo", label: "IPO" },
        { path: "/portfolio", label: "Portfolio" },
        { path: "/transactions", label: "Transactions" },
      ];

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav className="navbar">
      <div style={{ display: "flex", alignItems: "center", width: "100%", maxWidth: 1200, margin: "0 auto" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30,
            background: "var(--accent)",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14, color: "#fff",
          }}>SA</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            StockAuction
          </span>
        </Link>

        {user && (
          <div style={{ display: "flex", gap: 2, marginLeft: 36 }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  padding: "6px 14px",
                  borderRadius: 4,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  color: isActive(link.path) ? "var(--accent)" : "var(--text-secondary)",
                  background: isActive(link.path) ? "rgba(53,116,240,0.08)" : "transparent",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {user ? (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "5px 10px",
              }}>
                <div style={{
                  width: 24, height: 24,
                  borderRadius: 4,
                  background: isAdmin ? "var(--yellow)" : "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#fff",
                }}>
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.2 }}>
                    {user.name || user.username}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                    {user.role}
                  </div>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-outline" style={{ padding: "5px 12px", fontSize: 12 }}>
                Logout
              </button>
            </>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <Link to="/login">
                <button className="btn-outline" style={{ padding: "6px 14px", fontSize: 12 }}>Login</button>
              </Link>
              <Link to="/register">
                <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Register</button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
