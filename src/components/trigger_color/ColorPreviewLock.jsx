import { Lock, Unlock } from "lucide-react";
import React from "react";

/**
 * ColorPreviewLock - Displays selected color preview with lock indicator
 *
 * Responsibilities:
 * - Shows a 200x200px square displaying the selected color
 * - Displays hex code in center with contrasting text color
 * - Renders lock/unlock icon below preview
 * - Visual feedback: lock icon changes between locked/unlocked states
 */

export default function ColorPreviewLock({ selected, locked, onToggle }) {
	// Calculate contrasting text color based on background brightness
	// RGB sum > 384 (mid-point of 0-765) = light background = dark text
	const textColor = selected
		? selected.r + selected.g + selected.b > 384
			? "#000"
			: "#fff"
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

			{/* Lock/unlock icon indicator - CENTERED */}
			<div
				onClick={onToggle}
				style={{
					position: "absolute",
					bottom: "-18px",
					left: "100px",
					transform: "translateX(-50%)",
					width: "32px",
					height: "32px",
					borderRadius: "50%",
					backgroundColor: "white",
					border: "2px solid #000",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: selected ? "pointer" : "default",
					opacity: selected ? 1 : 0.5,
				}}
				title={locked ? "Click to unlock" : "Click to lock"}
			>
				{locked ? (
					<Lock size={16} color="#000" strokeWidth={2.5} />
				) : (
					<Unlock size={16} color="#000" strokeWidth={2.5} />
				)}
			</div>
		</div>
	);
}
