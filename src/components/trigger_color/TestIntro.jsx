import React from "react";

/**
 * TestIntro - Introduction/welcome screen for color synesthesia test
 *
 * Responsibilities:
 * - Displays test title, description, and instructions
 * - Shows estimated completion time
 * - Provides start button to begin test
 *
 */
export default function TestIntro({ introConfig, onStart }) {
	return (
		<div style={{ backgroundColor: "#f9fafb" }}>
			<div
				style={{
					maxWidth: "900px",
					margin: "0 auto",
					padding: "4rem 2rem",
					display: "flex",
					flexDirection: "column",
				}}
			>
				{/* Test title */}
				<h2
					style={{
						fontSize: "3rem",
						fontWeight: "bold",
						marginBottom: "2rem",
						color: "#111827",
						textAlign: "center",
					}}
				>
					{introConfig.title}
				</h2>

				{/* Test description */}
				<p
					style={{
						fontSize: "1.125rem",
						marginBottom: "1rem",
						lineHeight: "1.7",
						color: "#4b5563",
						overflowWrap: "break-word",
					}}
				>
					{introConfig.description}
				</p>
				{/* Instruction list */}
				<ul
					style={{
						textAlign: "left",
						maxWidth: "600px",
						lineHeight: "1.9",
						fontSize: "1rem",
						color: "#374151",
						padding: "1em",
					}}
				>
					{introConfig.instructions.map((txt, i) => (
						<li key={i} style={{ marginBottom: "0.5rem" }}>
							{txt}
						</li>
					))}
				</ul>

				{/* Time estimate */}
				<p
					style={{
						fontWeight: "bold",
						marginBottom: "3rem",
						color: "#6b7280",
						fontSize: "1rem",
					}}
				>
					⏱️ Estimated time: {introConfig.estimatedTime}
				</p>

				{/* Start button */}
				<button
					onClick={onStart}
					style={{
						fontSize: "1rem",
						padding: "1.75rem",
						border: "1px solid var(--color-black)",
						boxShadow: "0 5px 0px -1px var(--color-black)",
					}}
				>
					Start Test
				</button>
			</div>
		</div>
	);
}
