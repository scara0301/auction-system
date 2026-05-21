import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Timer from "./Timer";
import { sectorImage } from "../utils/images";

export default function AuctionCard({ auction }) {
  const navigate  = useNavigate();
  const [imgError, setImgError] = useState(false);

  const isLive   = auction.status === "open";
  const isClosed = auction.status === "closed";
  const progress = auction.totalShares > 0
    ? ((auction.totalShares - auction.remainingShares) / auction.totalShares) * 100
    : 0;
  const chg    = ((auction.currentHighestBid - auction.basePrice) / auction.basePrice) * 100;
  const chgUp  = chg >= 0;
  const imgUrl = sectorImage(auction.sector, 600, 200);

  return (
    <div
      className="auction-card"
      onClick={() => navigate(`/auction/${auction.id}`)}
    >
      {/* ── Photo banner ── */}
      <div className="auction-card-banner">
        {!imgError ? (
          <img
            src={imgUrl}
            alt={auction.sector}
            onError={() => setImgError(true)}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
          />
        ) : (
          <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg, #1e293b, #334155)" }} />
        )}

        {/* Gradient overlay */}
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.72) 100%)",
        }} />

        {/* Status badge */}
        <div style={{ position:"absolute", top:10, right:12 }}>
          {isLive   ? <span className="badge-open">LIVE</span>   :
           isClosed ? <span className="badge-closed">CLOSED</span> :
                      <span className="badge-upcoming">UPCOMING</span>}
        </div>

        {/* Company identity over photo */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0,
          padding:"10px 14px",
          display:"flex", alignItems:"flex-end", gap:10,
        }}>
          <div style={{
            width:38, height:38, borderRadius:9,
            background:"rgba(255,255,255,0.15)",
            backdropFilter:"blur(10px)",
            border:"1px solid rgba(255,255,255,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, fontWeight:800, color:"#fff", flexShrink:0,
          }}>
            {auction.logo || auction.company?.[0]}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff", lineHeight:1.2 }}>
              {auction.company}
            </div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.65)", fontFamily:"var(--font-mono)" }}>
              {auction.ticker} · {auction.sector}
            </div>
          </div>
          <span style={{
            fontFamily:"var(--font-mono)", fontSize:9, fontWeight:700,
            background:"rgba(255,255,255,0.15)", backdropFilter:"blur(6px)",
            border:"1px solid rgba(255,255,255,0.2)",
            color:"rgba(255,255,255,0.8)", padding:"2px 7px", borderRadius:4,
            textTransform:"uppercase", letterSpacing:"0.04em",
          }}>
            {auction.type}
          </span>
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="auction-card-body">
        {/* Price row */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>
              Highest Bid
            </div>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:"var(--font-mono)", color:"var(--text-primary)", letterSpacing:"-0.02em" }}>
              ₹{auction.currentHighestBid.toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:9, color:"var(--text-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>
              vs Base
            </div>
            <div style={{ fontSize:14, fontWeight:700, fontFamily:"var(--font-mono)", color: chgUp ? "var(--green)" : "var(--red)" }}>
              {chgUp ? "+" : ""}{chg.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Subscription bar */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:10, color:"var(--text-muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Subscription
            </span>
            <span style={{ fontSize:10, fontFamily:"var(--font-mono)", color: progress > 70 ? "var(--green)" : "var(--text-muted)", fontWeight:700 }}>
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="progress-bar" style={{ height:4 }}>
            <div className="progress-bar-fill" style={{
              width:`${progress}%`,
              background: progress > 90 ? "var(--green)" : "var(--accent)",
            }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:9, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>
              {(auction.totalShares - auction.remainingShares).toLocaleString("en-IN")} filled
            </span>
            <span style={{ fontSize:9, color:"var(--text-muted)", fontFamily:"var(--font-mono)" }}>
              {auction.totalShares.toLocaleString("en-IN")} total
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:11, color:"var(--text-muted)", display:"flex", alignItems:"center", gap:5 }}>
            {isLive ? (
              new Date(auction.endTime) > Date.now() ? (
                <>
                  <span style={{ fontSize:9, textTransform:"uppercase", fontWeight:700, letterSpacing:"0.06em" }}>Closes in</span>
                  <Timer endTime={auction.endTime} compact />
                </>
              ) : (
                <span style={{ fontSize:9, textTransform:"uppercase", fontWeight:700, letterSpacing:"0.06em", color:"var(--yellow)" }}>
                  Awaiting close
                </span>
              )
            ) : isClosed ? (
              <span style={{ fontFamily:"var(--font-mono)" }}>
                {(auction.bidCount || 0)} bids
              </span>
            ) : (
              <span style={{ fontFamily:"var(--font-mono)" }}>
                {(auction.bidCount || 0)} bids
              </span>
            )}
          </div>
          <button
            className={isLive ? "btn-primary" : "btn-outline"}
            style={{ padding:"5px 14px", fontSize:11, fontWeight:700 }}
            onClick={(e) => { e.stopPropagation(); navigate(`/auction/${auction.id}`); }}
          >
            {isLive ? "Bid Now" : "View"}
          </button>
        </div>
      </div>
    </div>
  );
}
