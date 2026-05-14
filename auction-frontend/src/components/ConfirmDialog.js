import React from "react";

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9000,
    }}>
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 24,
        maxWidth: 380,
        width: "calc(100% - 32px)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 20 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            className="btn-outline"
            style={{ padding: "7px 18px", fontSize: 13 }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            style={{ padding: "7px 18px", fontSize: 13 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
