import "../../styles/app.css";

export default function TypeRow({
	title,
	description,
	name,
	value,
	onChange,
	disabled = false,
	compact = false,
}) {
	const options = [
		{ value: "yes", label: "Yes" },
		{ value: "sometimes", label: "Sometimes" },
		{ value: "no", label: "No" },
	];

	const handleChange = (event) => {
		if (onChange && !disabled) {
			onChange(event.target.value);
		}
	};

	return (
		<li
			className="type-row"
			style={{
				opacity: disabled ? 0.6 : 1,
				padding: compact ? "0.5rem 0" : "1.5rem 0",
				borderBottom: compact ? "1px solid #e5e7eb" : undefined,
			}}
		>
			<div className="type-main">
				<div
					className="type-title"
					style={{
						fontSize: compact ? "1.125rem" : "1.5rem",
						fontWeight: 700,
						marginBottom: compact ? "0.125rem" : "0.5rem",
					}}
				>
					{title}
				</div>
				<div
					className="type-sub"
					style={{
						fontSize: compact ? "0.875rem" : "1.125rem",
						color: "#6b7280",
					}}
				>
					{description}
				</div>
			</div>
			<div className="type-opts" style={{ gap: compact ? "1rem" : "1.75rem" }}>
				{options.map((option) => (
					<label
						className="opt"
						key={option.value}
						style={{
							fontSize: compact ? "1rem" : "1.375rem",
							fontWeight: 600,
							cursor: "pointer",
						}}
					>
						<input
							type="radio"
							name={name}
							value={option.value}
							checked={value === option.value}
							onChange={handleChange}
							disabled={disabled}
							aria-label={`${title} — ${option.label}`}
						/>
						<span>{option.label}</span>
					</label>
				))}
			</div>
		</li>
	);
}
