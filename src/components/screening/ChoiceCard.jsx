import "../../styles/app.css";

export default function ChoiceCard({
	title,
	subtitle,
	variant = "default",
	selected,
	onClick,
	disabled = false,
	compact = false,
	...props
}) {
	const className =
		(selected ? "selected " : "") +
		(variant === "negative" ? "choice-negative" : "choice-card");
	const titleClass =
		variant === "negative" ? "choice-negative-title" : "choice-title";
	const subClass =
		variant === "negative" ? "choice-negative-subtitle" : "choice-subtitle";

	const content = (
		<>
			<div
				className={titleClass}
				style={{
					fontSize: compact ? "1.125rem" : "1.5rem",
					fontWeight: 700,
					marginBottom: compact ? "0.25rem" : "0.5rem",
				}}
			>
				{title}
			</div>
			<div
				className={subClass}
				style={{ fontSize: compact ? "0.875rem" : "1.125rem" }}
			>
				{subtitle}
			</div>
		</>
	);

	return (
		<button
			type="button"
			className={className}
			onClick={(event) => {
				if (onClick && !disabled) {
					onClick(event);
				}
			}}
			disabled={disabled}
			style={{
				opacity: disabled ? 0.6 : 1,
				cursor: disabled ? "not-allowed" : "pointer",
				padding: compact ? "0.75rem 1rem" : "1.5rem",
				width: "100%",
				textAlign: "left",
			}}
			{...props}
		>
			{content}
		</button>
	);
}
