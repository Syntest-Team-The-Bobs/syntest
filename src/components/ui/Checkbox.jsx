import "../../styles/app.css";

export default function Checkbox({
	children,
	checked,
	onChange,
	className,
	...props
}) {
	const classes = `checkbox-group ${className || ""}`.trim();
	return (
		<label
			className={classes}
			style={{
				fontSize: "1.375rem",
				display: "flex",
				alignItems: "flex-start",
				gap: "1.125rem",
				marginBottom: "1.25rem",
				cursor: "pointer",
			}}
		>
			<input
				type="checkbox"
				checked={checked}
				onChange={onChange}
				style={{
					width: "26px",
					height: "26px",
					marginTop: "4px",
					flexShrink: 0,
					cursor: "pointer",
				}}
				{...props}
			/>
			<span style={{ lineHeight: 1.5 }}>{children}</span>
		</label>
	);
}
