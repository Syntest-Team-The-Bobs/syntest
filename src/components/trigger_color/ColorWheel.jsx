import { useEffect, useRef, useState } from "react";

/**
 * ColorWheel - Square gradient color picker with drag-to-select functionality
 *
 * Responsibilities:
 * - Renders a canvas with rainbow gradient (horizontal) + brightness gradient (vertical)
 * - Handles mouse interactions: click-and-drag to select colors
 * - Extracts RGB/hex values from clicked pixel
 * - Manages drag state and lock interactions
 */

export default function ColorWheel({
	width = 500,
	height = 400,
	lock = false,
	onPick,
	onToggleLock,
}) {
	const canvasRef = useRef(null);
	const [isDragging, setIsDragging] = useState(false);

	/**
	 * Draws the color gradient on canvas mount or when dimensions change
	 * Creates a 2D color space: hue (horizontal) × brightness (vertical)
	 */
	useEffect(() => {
		const c = canvasRef.current;
		if (!c) return;

		const ctx = c.getContext("2d");
		const w = c.width;
		const h = c.height;

		// Layer 1: Horizontal rainbow gradient (hue spectrum)
		const hueGradient = ctx.createLinearGradient(0, 0, w, 0);
		hueGradient.addColorStop(0, "rgb(255, 0, 0)"); // Red
		hueGradient.addColorStop(0.17, "rgb(255, 255, 0)"); // Yellow
		hueGradient.addColorStop(0.33, "rgb(0, 255, 0)"); // Green
		hueGradient.addColorStop(0.5, "rgb(0, 255, 255)"); // Cyan
		hueGradient.addColorStop(0.67, "rgb(0, 0, 255)"); // Blue
		hueGradient.addColorStop(0.83, "rgb(255, 0, 255)"); // Magenta
		hueGradient.addColorStop(1, "rgb(255, 0, 0)"); // Red (loop back)

		ctx.fillStyle = hueGradient;
		ctx.fillRect(0, 0, w, h);

		// Layer 2: Vertical white gradient (top half - adds lightness)
		const whiteGradient = ctx.createLinearGradient(0, 0, 0, h / 2);
		whiteGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
		whiteGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

		ctx.fillStyle = whiteGradient;
		ctx.fillRect(0, 0, w, h);

		// Layer 3: Vertical black gradient (bottom half - adds darkness)
		const blackGradient = ctx.createLinearGradient(0, h / 2, 0, h);
		blackGradient.addColorStop(0, "rgba(0, 0, 0, 0)");
		blackGradient.addColorStop(1, "rgba(0, 0, 0, 1)");

		ctx.fillStyle = blackGradient;
		ctx.fillRect(0, 0, w, h);
	}, [width, height]);

	/**
	 * Extracts RGB color data from canvas at mouse position
	 * Scales mouse coordinates to canvas resolution
	 * Returns color object with RGB, hex, and position
	 */
	function colorAt(e) {
		const c = canvasRef.current;
		if (!c) return null;

		const rect = c.getBoundingClientRect();
		// Scale mouse position to canvas coordinates, clamp to bounds
		const x = Math.min(
			Math.max(0, ((e.clientX - rect.left) * c.width) / rect.width),
			c.width - 1,
		);
		const y = Math.min(
			Math.max(0, ((e.clientY - rect.top) * c.height) / rect.height),
			c.height - 1,
		);

		const ctx = c.getContext("2d");
		const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
		const hex =
			`${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();

		return { r, g, b, hex, x, y };
	}

	/**
	 * Initiates color selection on mouse down
	 * Starts drag state and picks initial color
	 */
	function handleMouseDown(e) {
		if (lock) return;
		setIsDragging(true);
		const color = colorAt(e);
		if (color) onPick?.(color);
	}

	/**
	 * Continuously picks color while dragging
	 * Only active when mouse is pressed and not locked
	 */
	function handleMouseMove(e) {
		if (lock || !isDragging) return;
		const color = colorAt(e);
		if (color) onPick?.(color);
	}

	/**
	 * Ends drag state on mouse release
	 */
	function handleMouseUp() {
		setIsDragging(false);
	}

	/**
	 * Toggles lock state on click (not drag)
	 * Prevents lock toggle during color selection drag
	 */
	function handleClick(e) {
		if (!isDragging) {
			onToggleLock?.();
		}
	}

	/**
	 * Global mouse up listener to handle drag ending outside canvas
	 * Ensures drag state is cleaned up even if mouse leaves canvas
	 */
	useEffect(() => {
		const handleGlobalMouseUp = () => setIsDragging(false);
		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
	}, []);

	return (
		<canvas
			ref={canvasRef}
			width={width}
			height={height}
			style={{
				width,
				height,
				border: "3px solid #000",
				display: "block",
				cursor: lock ? "default" : "crosshair",
			}}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			onClick={handleClick}
		/>
	);
}
