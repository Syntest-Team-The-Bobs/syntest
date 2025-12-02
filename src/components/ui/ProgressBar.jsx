import React from "react";

export default function ProgressBar({ value, label = "Trial:" }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "600" }}>{label}</span>
      <div style={{ flex: 1, backgroundColor: "#d1d5db", height: "8px", position: "relative", borderRadius: "4px", overflow: "hidden" }}>
        <div style={{ backgroundColor: "#000", height: "100%", width: `${pct}%`, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}