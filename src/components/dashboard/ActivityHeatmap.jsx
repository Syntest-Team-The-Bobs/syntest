import { useEffect, useMemo, useRef } from "react";

export default function ActivityHeatmap({ data }) {
	const canvasRef = useRef(null);

	const maxValue = useMemo(() => {
		if (!data || data.length === 0) return 1;
		return Math.max(...data, 1);
	}, [data]);

	useEffect(() => {
		if (!data || !canvasRef.current || data.length === 0) return;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		const cellSize = 12;
		const gap = 3;
		const days = 7;
		const weeks = Math.ceil(data.length / days);

		canvas.width = weeks * (cellSize + gap) + 20; // Extra space for labels
		canvas.height = days * (cellSize + gap) + 30;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw heatmap cells
		data.forEach((value, index) => {
			const week = Math.floor(index / days);
			const day = index % days;
			const x = week * (cellSize + gap) + 10;
			const y = day * (cellSize + gap) + 20;

			// Color based on activity level (using a gradient from light to dark blue)
			const intensity = Math.min(value / maxValue, 1);
			const alpha = 0.3 + intensity * 0.7; // Range from 0.3 to 1.0
			const color = `rgba(59, 130, 246, ${alpha})`;

			ctx.fillStyle = color;
			ctx.fillRect(x, y, cellSize, cellSize);

			// Add border
			ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
			ctx.lineWidth = 1;
			ctx.strokeRect(x, y, cellSize, cellSize);
		});

		// Draw day labels
		const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		ctx.fillStyle = "#6b7280";
		ctx.font = "10px sans-serif";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";
		dayLabels.forEach((label, day) => {
			const y = day * (cellSize + gap) + 20 + cellSize / 2;
			ctx.fillText(label, 8, y);
		});
	}, [data, maxValue]);

	if (!data || data.length === 0) {
		return (
			<div
				style={{
					height: "150px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<p style={{ color: "#6b7280" }}>No activity data available</p>
			</div>
		);
	}

	return (
		<div className="activity-heatmap">
			<canvas ref={canvasRef} />
			<div className="heatmap-legend">
				<span>Less</span>
				<div className="legend-gradient" />
				<span>More</span>
				<span className="legend-max">Max: {maxValue} tests</span>
			</div>
		</div>
	);
}
