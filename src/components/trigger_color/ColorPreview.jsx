import "../../styles/app.css";

export default function ColorPreview({ color, hex }) {
	return (
		<div
			className="swatch"
			aria-label="Selected color preview"
			style={{
				backgroundColor: color || "#fff",
				marginTop: "12px",
			}}
		>
			<div className="hex">{hex || "———"}</div>
		</div>
	);
}
