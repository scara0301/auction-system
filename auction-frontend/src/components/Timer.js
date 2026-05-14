import React, { useEffect, useState } from "react";

function parseTime(totalSeconds) {
  if (totalSeconds <= 0) return { h: "00", m: "00", s: "00", total: 0 };
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return {
    h: String(h).padStart(2, "0"),
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
    total: totalSeconds,
  };
}

export default function Timer({ endTime, compact = false }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000));
    setRemaining(calc());
    const interval = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const time = parseTime(remaining);
  const isUrgent  = remaining > 0 && remaining < 600;   // < 10 min
  const isCritical = remaining > 0 && remaining < 60;   // < 1 min
  const isExpired = remaining === 0;

  /* ── Compact inline ───────────────────────────────────── */
  if (compact) {
    if (isExpired) return (
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
        color: "var(--text-muted)",
      }}>Ended</span>
    );
    return (
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
        color: isCritical ? "var(--red)" : isUrgent ? "var(--yellow)" : "var(--text-secondary)",
        animation: isCritical ? "urgentPulse 0.8s ease-in-out infinite" : "none",
      }}>
        {time.h}:{time.m}:{time.s}
      </span>
    );
  }

  /* ── Expired state ────────────────────────────────────── */
  if (isExpired) return (
    <div style={{
      background: "var(--red-dim)",
      border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: "var(--radius-md)",
      padding: "16px 20px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        Auction Closed
      </div>
    </div>
  );

  /* ── Full block timer ─────────────────────────────────── */
  const accentColor = isCritical ? "var(--red)" : isUrgent ? "var(--yellow)" : "var(--accent)";
  const bgColor = isCritical
    ? "rgba(239,68,68,0.04)"
    : isUrgent
    ? "rgba(245,158,11,0.04)"
    : "var(--bg-card)";
  const borderColor = isCritical
    ? "rgba(239,68,68,0.25)"
    : isUrgent
    ? "rgba(245,158,11,0.2)"
    : "var(--border)";

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-md)",
      padding: "14px 16px",
      textAlign: "center",
      transition: "border-color 0.3s, background 0.3s",
      boxShadow: isCritical ? "0 0 20px rgba(239,68,68,0.1)" : "none",
    }}>
      {/* Label */}
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: accentColor,
        marginBottom: 10,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}>
        {isCritical ? (
          <>
            <span className="live-dot-red" />
            Closing Now
          </>
        ) : isUrgent ? (
          "Closing Soon"
        ) : (
          "Time Remaining"
        )}
      </div>

      {/* Digit blocks */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        {[
          { val: time.h, label: "HRS" },
          { val: time.m, label: "MIN" },
          { val: time.s, label: "SEC" },
        ].map((unit, i) => (
          <React.Fragment key={unit.label}>
            {i > 0 && (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700,
                color: accentColor, opacity: 0.5,
                paddingBottom: 14, lineHeight: 1,
              }}>:</div>
            )}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "var(--font-mono)",
                fontSize: 30, fontWeight: 800,
                color: isCritical ? "var(--red)" : "var(--text-primary)",
                lineHeight: 1,
                minWidth: 48,
                background: "var(--bg-secondary)",
                borderRadius: 6,
                padding: "6px 4px 4px",
                border: `1px solid ${isCritical ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
                letterSpacing: "-0.04em",
                animation: isCritical ? "urgentPulse 0.8s ease-in-out infinite" : "none",
              }}>
                {unit.val}
              </div>
              <div style={{
                fontSize: 8, color: accentColor, opacity: 0.7,
                fontWeight: 700, letterSpacing: "0.1em", marginTop: 4,
                textTransform: "uppercase",
              }}>
                {unit.label}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
