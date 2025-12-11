import ProgressBar from "../ui/ProgressBar";
import ColorPreviewLock from "./ColorPreviewLock";
import ColorWheel from "./ColorWheel";
import MusicPlayButton from "./MusicPlayButton";
import StimulusDisplay from "./StimulusDisplay";
import TestInstructions from "./TestInstructions";
import TestProgress from "./TestProgress";

/**
 * TestLayout - Main UI layout for color synesthesia test interface
 *
 * Responsibilities:
 * - Orchestrates layout of all test UI components in a 3-column grid
 * - Displays title, instructions, and progress information
 * - Manages visual hierarchy and spacing of test elements
 * - Routes between MusicPlayButton (music tests) and StimulusDisplay (text tests)
 */
export default function TestLayout({
	title,
	testType,
	phase,
	// current,
	stimulus,
	currentTrial,
	progressInTrial,
	itemsPerTrial,
	locked,
	selected,
	noExperience,
	progressValue,
	onPick,
	onToggleLock,
	onToggleNoExperience,
	onNext,
	onReplay,
	getFontSize,
}) {
	return (
		<div
			style={{
				backgroundColor: "#f9fafb",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<div style={{ maxWidth: "1200px", padding: "1rem 1rem" }}>
				{/* Page title */}
				<h1
					style={{
						fontSize: "2rem",
						fontWeight: "bold",
						textAlign: "center",
						marginBottom: "1.8rem",
						color: "#111827",
					}}
				>
					{title}: CONSISTENCY & SPEED
				</h1>

				<div
					style={{
						display: "flex",
						flexDirection: "row",
						gap: "2rem",
						justifyContent: "space-between",
						alignItems: "flex-start",
					}}
				>
					{/* Test phase and progress indicators */}
					<div
						style={{
							width: "20%",
							height: "100%",
						}}
					>
						<h2
							style={{
								fontSize: "1.25rem",
								fontWeight: "bold",
								marginTop: "1rem",
								marginBottom: "0.5rem",
								color: "#111827",
							}}
						>
							{phase === "practice" ? "PRACTICE" : "CONSISTENCY TEST"}
						</h2>
						<TestProgress
							stimulus={stimulus}
							currentTrial={currentTrial}
							totalTrials={3}
							currentItem={progressInTrial}
							totalItems={itemsPerTrial}
						/>

						<div
							style={{
								alignItems: "start",
								marginTop: "3em",
							}}
						>
							{/* Left: Instructions */}
							<TestInstructions testType={testType} />
						</div>
					</div>

					{/* Center: Color picker */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<ColorWheel
							width={500}
							height={400}
							lock={locked}
							onPick={onPick}
							onToggleLock={onToggleLock}
						/>
						<p
							style={{
								fontSize: "0.8125rem",
								color: "#6b7280",
								marginTop: "1rem",
								textAlign: "center",
								maxWidth: "450px",
								lineHeight: "1.5",
							}}
						>
							Click and hold, then drag to adjust. Click to{" "}
							<strong>lock</strong> (shows lock icon); click again to unlock.
						</p>
					</div>

					{/* Right: Stimulus, preview, and action button */}
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "stretch",
							width: "280px",
						}}
					>
						{/* Conditional rendering: MusicPlayButton for music, StimulusDisplay for text */}
						{testType === "music" && onReplay ? (
							<MusicPlayButton stimulus={stimulus} onReplay={onReplay} />
						) : (
							<StimulusDisplay
								stimulus={stimulus}
								testType={testType}
								getFontSize={getFontSize}
							/>
						)}

						<ColorPreviewLock
							selected={selected}
							locked={locked}
							onToggle={onToggleLock}
						/>

						{/* No Experience Checkbox - NEW */}
						<div
							style={{
								marginTop: "1rem",
								marginBottom: "0.5rem",
								padding: "0.5rem",
								backgroundColor: "#f9fafb",
								border: "1px solid #e5e7eb",

								boxSizing: "border-box",
								maxWidth: "245px",
							}}
						>
							<label
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									cursor: "pointer",
									userSelect: "none",
								}}
							>
								<input
									type="checkbox"
									checked={noExperience}
									onChange={onToggleNoExperience}
									style={{
										width: "16px",
										height: "16px",
										cursor: "pointer",
										accentColor: "#000",
										flexShrink: 0,
									}}
								/>
								<span
									style={{
										fontSize: "0.875rem",
										color: "#111827",
										fontWeight: "500",
										lineHeight: "1.3",
									}}
								>
									No synesthetic experience
								</span>
							</label>
							<p
								style={{
									fontSize: "0.75rem",
									color: "#6b7280",
									marginTop: "0.375rem",
									marginLeft: "1.25rem",
									marginBottom: 0,
									lineHeight: "1.3",
								}}
							>
								Check this if you don't experience any color association with
								this {testType}.
							</p>
						</div>

						{/* Next button - disabled until color is locked OR no experience checked */}
						<button
							type="button"
							onClick={onNext}
							disabled={!locked && !noExperience}
							style={{
								marginTop: "1rem",
								padding: "0.625rem 2rem",
								border: "none",

								cursor: locked || noExperience ? "pointer" : "not-allowed",
								backgroundColor: locked || noExperience ? "#000" : "#d1d5db",
								color: "white",
								fontWeight: "600",
								fontSize: "0.875rem",
								alignSelf: "flex-start",
							}}
						>
							Next →
						</button>
					</div>
				</div>

				{/* Bottom: Overall progress bar */}
				<div
					style={{
						marginTop: "2rem",
						maxWidth: "900px",
						margin: "1.5rem auto 0",
					}}
				>
					<ProgressBar value={progressValue} />
				</div>
			</div>
		</div>
	);
}
