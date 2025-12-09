import React from "react";

export default function ProgressBar({
	value,
	current,
	total,
	label = "Progress",
}) {
	const clamp = (v) => Math.max(0, Math.min(1, v));
	const percentage =
		value != null
			? clamp(value) * 100
			: current != null && total
				? Math.max(0, Math.min(100, Math.round((current / total) * 100)))
				: 0;

	const leftLabel =
		current != null && total != null ? `Step ${current} of ${total}` : label;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: "1rem",
				width: "100%",
				marginBottom: "1rem",
			}}
		>
			<span
				style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "600" }}
			>
				{leftLabel}
			</span>
			<div
				style={{
					flex: 1,
					backgroundColor: "#d1d5db",
					height: "8px",
					position: "relative",
					borderRadius: "4px",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						backgroundColor: "#000",
						height: "100%",
						width: `${percentage}%`,
						transition: "width 0.3s ease",
					}}
				/>
			</div>
		</div>
	);
}
