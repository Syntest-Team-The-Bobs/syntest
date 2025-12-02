import React from "react";

/**
 * ColorPreviewLock - Displays selected color preview with lock indicator
 * 
 * Responsibilities:
 * - Shows a 200x200px square displaying the selected color
 * - Displays hex code in center with contrasting text color
 * - Renders lock/unlock indicator circle below preview
 * - Visual feedback: circle turns red when locked
 */

export default function ColorPreviewLock({ selected, locked, onToggle }) {
  // Calculate contrasting text color based on background brightness
  // RGB sum > 384 (mid-point of 0-765) = light background = dark text
  const textColor = selected 
    ? (selected.r + selected.g + selected.b > 384 ? "#000" : "#fff") 
    : "#6b7280";

  return (
    <div style={{ position: "relative", marginTop: "0.5rem" }}>
      {/* Color preview square */}
      <div
        style={{
          width: "200px",
          height: "200px",
          border: "3px solid #000",
          backgroundColor: selected ? `#${selected.hex}` : "#e3e6ee",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.75rem",
          color: textColor,
          fontFamily: "monospace",
        }}
      >
        {selected ? selected.hex : "———"}
      </div>

      {/* Lock/unlock indicator circle */}
      <div
        onClick={onToggle}
        style={{
          position: "absolute",
          bottom: "-14px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          border: "2px solid",
          borderColor: locked ? "#dc2626" : "#000",
          backgroundColor: locked ? "#dc2626" : "white",
          cursor: selected ? "pointer" : "default",
        }}
        title={locked ? "Click to unlock" : "Click to lock"}
      />
    </div>
  );
}