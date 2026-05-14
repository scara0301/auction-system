import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);
const ToastContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("authToken", token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const colors = {
    success: { bg: "rgba(46,168,111,0.1)", border: "rgba(46,168,111,0.25)", color: "var(--green, #2ea86f)" },
    error: { bg: "rgba(217,74,74,0.1)", border: "rgba(217,74,74,0.25)", color: "var(--red, #d94a4a)" },
    info: { bg: "rgba(53,116,240,0.1)", border: "rgba(53,116,240,0.25)", color: "var(--accent, #3574f0)" },
    warning: { bg: "rgba(201,152,26,0.1)", border: "rgba(201,152,26,0.25)", color: "var(--yellow, #c9981a)" },
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} className="toast" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
              <span style={{ flex: 1, fontSize: 13 }}>{t.message}</span>
              <button onClick={() => removeToast(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: c.color, fontSize: 14, padding: 0, lineHeight: 1 }}>
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
