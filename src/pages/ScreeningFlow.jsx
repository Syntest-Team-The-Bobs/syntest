import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChoiceCard from "../components/screening/ChoiceCard";
import TypeRow from "../components/screening/TypeRow";
import Button from "../components/ui/Button";
import useScreeningState from "../hooks/useScreeningState";
import { screeningService } from "../services/screening";
import "../styles/app.css";

const SUMMARY_STORAGE_KEY = "screening_summary";

// Step labels for navigation
const STEP_LABELS = [
	{ num: 0, label: "Consent", short: "1" },
	{ num: 1, label: "Definition", short: "2" },
	{ num: 2, label: "Types", short: "3" },
	{ num: 3, label: "Results", short: "4" },
];

export default function ScreeningFlow() {
	const navigate = useNavigate();
	const { state, updateState, clearState, handleSynTypesChange } =
		useScreeningState();
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const [completedSteps, setCompletedSteps] = useState(new Set());
	const [summary, setSummary] = useState(() => {
		if (typeof window === "undefined") {
			return null;
		}
		const stored = window.sessionStorage.getItem(SUMMARY_STORAGE_KEY);
		return stored ? JSON.parse(stored) : null;
	});

	// Refs for each section
	const sectionRefs = {
		0: useRef(null),
		1: useRef(null),
		2: useRef(null),
		3: useRef(null),
	};

	const scrollToSection = (stepNum) => {
		const ref = sectionRefs[stepNum];
		if (ref?.current) {
			ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const persistSummary = useCallback((payload) => {
		setSummary(payload);
		if (typeof window !== "undefined") {
			window.sessionStorage.setItem(
				SUMMARY_STORAGE_KEY,
				JSON.stringify(payload),
			);
		}
	}, []);

	const resetSummary = useCallback(() => {
		setSummary(null);
		if (typeof window !== "undefined") {
			window.sessionStorage.removeItem(SUMMARY_STORAGE_KEY);
		}
	}, []);

	const withSaving = useCallback(async (fn) => {
		setSaving(true);
		setError(null);
		try {
			await fn();
		} catch (err) {
			console.error("Screening step failed", err);
			const serverMessage =
				err?.response?.data?.message ||
				err?.message ||
				"Unable to save your responses. Please try again.";
			setError(serverMessage);
		} finally {
			setSaving(false);
		}
	}, []);

	const hasEligibleType = useMemo(
		() =>
			Object.values(state.synTypes).some(
				(value) => value === "yes" || value === "sometimes",
			),
		[state.synTypes],
	);

	// Check if step is accessible (can view and edit)
	const isStepAccessible = (stepNum) => {
		switch (stepNum) {
			case 0:
				return true;
			case 1:
				return completedSteps.has(0);
			case 2:
				return completedSteps.has(1) && state.definition !== "no";
			case 3:
				return completedSteps.has(2) && summary !== null;
			default:
				return false;
		}
	};

	const handleConsentSubmit = async () => {
		if (!state.consent || saving) return;
		await withSaving(async () => {
			await screeningService.saveConsent(state.consent);
			setCompletedSteps((prev) => new Set(prev).add(0));
			setTimeout(() => scrollToSection(1), 100);
		});
	};

	const handleStep1Next = async () => {
		if (!state.definition) {
			setError("Select the option that best fits you to continue.");
			return;
		}
		await withSaving(async () => {
			await screeningService.saveStep2(state.definition);
			setCompletedSteps((prev) => new Set(prev).add(1));
			if (state.definition === "no") {
				resetSummary();
				navigate("/screening/exit/A");
				return;
			}
			setTimeout(() => scrollToSection(2), 100);
		});
	};

	const handleStep2Next = async () => {
		if (saving) return;
		await withSaving(async () => {
			try {
				await screeningService.saveStep4(
					state.synTypes,
					state.otherExperiences,
				);
				setCompletedSteps((prev) => new Set(prev).add(2));
				if (!hasEligibleType) {
					const result = await screeningService.finalize();
					resetSummary();
					if (result?.exit_code) {
						navigate(`/screening/exit/${result.exit_code}`);
					} else {
						navigate("/screening/exit/NONE");
					}
					return;
				} else {
					const result = await screeningService.finalize();
					persistSummary(result);
					if (result?.exit_code && !result?.eligible) {
						navigate(`/screening/exit/${result.exit_code}`);
						return;
					}
					setTimeout(() => scrollToSection(3), 100);
				}
			} catch (err) {
				console.error("Step 2 save failed:", err);
				throw err;
			}
		});
	};

	const startAssignedTests = () => {
		clearState();
		resetSummary();
		navigate("/participant/dashboard");
	};

	const summarySelectedTypes =
		summary?.selected_types || summary?.selectedTypes || [];
	const summaryRecommendations =
		summary?.recommended || summary?.recommended_tests || [];

	// Styles - BIGGER everything, optimized for viewport fit
	const containerStyle = {
		maxWidth: "1000px",
		margin: "0 auto",
		padding: "1rem 2rem 3rem",
		fontSize: "1.25rem",
	};

	const stickyNavStyle = {
		position: "sticky",
		top: 0,
		zIndex: 100,
		background:
			"linear-gradient(to bottom, #f9fafb 0%, #f9fafb 85%, transparent 100%)",
		paddingTop: "0.5rem",
		paddingBottom: "0.75rem",
		marginBottom: "0.5rem",
	};

	// Compact steps (1 and 2) need smaller padding/margins to fit viewport
	const isCompactStep = (stepNum) => stepNum === 1 || stepNum === 2;

	const sectionStyle = (stepNum) => ({
		background: "#ffffff",
		borderRadius: "16px",
		padding: isCompactStep(stepNum) ? "1.25rem 1.75rem" : "2.5rem",
		marginBottom: isCompactStep(stepNum) ? "0.75rem" : "1.5rem",
		boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
		border: "3px solid",
		borderColor: completedSteps.has(stepNum)
			? "#10b981"
			: isStepAccessible(stepNum)
				? "#d1d5db"
				: "#f3f4f6",
		opacity: isStepAccessible(stepNum) ? 1 : 0.4,
		transition: "all 0.3s ease",
		scrollMarginTop: "70px",
		minHeight: "fit-content",
	});

	const sectionTitleStyle = {
		fontSize: "2rem",
		fontWeight: 700,
		marginBottom: "1.5rem",
		color: "#111827",
	};

	const compactTitleStyle = {
		fontSize: "1.5rem",
		fontWeight: 700,
		marginBottom: "0.75rem",
		color: "#111827",
	};

	const textStyle = {
		fontSize: "1.375rem",
		lineHeight: 1.6,
		color: "#374151",
		marginBottom: "1.5rem",
	};

	const compactTextStyle = {
		fontSize: "1.125rem",
		lineHeight: 1.4,
		color: "#374151",
		marginBottom: "0.75rem",
	};

	const mutedTextStyle = {
		fontSize: "1.125rem",
		color: "#6b7280",
		marginTop: "1rem",
	};

	const actionsStyle = {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: "2rem",
		paddingTop: "1.5rem",
		borderTop: "2px solid #e5e7eb",
		gap: "1.5rem",
	};

	const compactActionsStyle = {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: "1rem",
		paddingTop: "0.75rem",
		borderTop: "2px solid #e5e7eb",
		gap: "1rem",
	};

	// Sticky Navigation component
	const StepNavigation = () => (
		<div style={stickyNavStyle}>
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					gap: "0.5rem",
					flexWrap: "wrap",
				}}
			>
				{STEP_LABELS.map((step, index) => {
					const isAccessible = isStepAccessible(step.num);
					const isCompleted = completedSteps.has(step.num);

					return (
						<div
							key={step.num}
							style={{ display: "flex", alignItems: "center" }}
						>
							<button
								type="button"
								onClick={() => scrollToSection(step.num)}
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									padding: "0.5rem 1rem",
									background: isCompleted
										? "#10b981"
										: isAccessible
											? "#3730a3"
											: "#e5e7eb",
									color: isCompleted || isAccessible ? "#ffffff" : "#9ca3af",
									border: "none",
									borderRadius: "10px",
									cursor: "pointer",
									transition: "all 0.2s ease",
									minWidth: "70px",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.transform = "scale(1.05)";
									e.currentTarget.style.boxShadow =
										"0 4px 12px rgba(0,0,0,0.15)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.transform = "scale(1)";
									e.currentTarget.style.boxShadow = "none";
								}}
							>
								<span style={{ fontSize: "1.25rem", fontWeight: 700 }}>
									{isCompleted ? "✓" : step.short}
								</span>
								<span
									style={{
										fontSize: "0.75rem",
										fontWeight: 600,
										marginTop: "2px",
									}}
								>
									{step.label}
								</span>
							</button>
							{index < STEP_LABELS.length - 1 && (
								<div
									style={{
										width: "24px",
										height: "3px",
										background: completedSteps.has(step.num)
											? "#10b981"
											: "#e5e7eb",
										margin: "0 4px",
										borderRadius: "2px",
									}}
								/>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);

	return (
		<div style={containerStyle}>
			<StepNavigation />

			{error && (
				<div
					className="alert alert-error"
					role="alert"
					style={{
						marginBottom: "2rem",
						fontSize: "1.25rem",
						padding: "1.25rem",
					}}
				>
					{error}
				</div>
			)}

			{/* Step 0: Consent */}
			<div ref={sectionRefs[0]} style={sectionStyle(0)}>
				<h2 style={sectionTitleStyle}>Step 1: Welcome to the Screening</h2>

				<p style={textStyle}>
					In this screening, we'll check basic eligibility and learn about your
					synesthetic experiences. This should take about 3-5 minutes.
				</p>

				<label
					className="checkbox-group"
					htmlFor="consent"
					style={{
						fontSize: "1.375rem",
						display: "flex",
						alignItems: "flex-start",
						gap: "1.25rem",
						marginBottom: "1.5rem",
					}}
				>
					<input
						id="consent"
						type="checkbox"
						checked={state.consent}
						onChange={(e) => updateState({ consent: e.target.checked })}
						style={{ width: "26px", height: "26px", marginTop: "4px" }}
						data-audit-label="Consent agreement"
					/>
					<span style={{ fontSize: "1.375rem", lineHeight: 1.5 }}>
						I consent to take part in this study.
					</span>
				</label>

				<p style={mutedTextStyle}>
					By checking this box, you acknowledge that you have read and
					understood the study information sheet, agree to participate
					voluntarily, and consent to the collection and use of your data for
					research purposes.
				</p>

				<div style={actionsStyle}>
					<div></div>
					<Button
						disabled={!state.consent || saving}
						onClick={handleConsentSubmit}
						style={{ fontSize: "1.375rem", padding: "1rem 2.25rem" }}
					>
						{saving ? "Saving…" : "Save & Continue →"}
					</Button>
				</div>
			</div>

			{/* Step 1: Definition */}
			<div ref={sectionRefs[1]} style={sectionStyle(1)}>
				<h2 style={compactTitleStyle}>Step 2: What is Synesthesia?</h2>

				<p style={compactTextStyle}>
					Synesthesia is when one sense triggers another — like letters having
					colors or sounds having shapes.
				</p>

				<div
					className="grid-2"
					style={{ marginBottom: "0.75rem", fontSize: "1rem", gap: "1rem" }}
				>
					<div>
						<div
							className="label-uppercase"
							style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}
						>
							EXAMPLES
						</div>
						<ul className="arrow-list" style={{ fontSize: "1rem", margin: 0 }}>
							<li>
								<span className="arrow"></span> Letters → Colors
							</li>
							<li>
								<span className="arrow"></span> Music → Colors
							</li>
							<li>
								<span className="arrow"></span> Words → Tastes
							</li>
						</ul>
					</div>
					<div>
						<div
							className="label-uppercase"
							style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}
						>
							NOT SYNESTHESIA
						</div>
						<ul className="plain-list" style={{ fontSize: "1rem", margin: 0 }}>
							<li>Mnemonics</li>
							<li>Guesses</li>
							<li>Random choices</li>
						</ul>
					</div>
				</div>

				<p
					style={{
						...compactTextStyle,
						fontWeight: 600,
						marginBottom: "0.5rem",
					}}
				>
					Do you experience synesthesia?
				</p>

				<div>
					<div
						className="choice-grid"
						style={{ marginBottom: "0.5rem", gap: "0.5rem" }}
					>
						<ChoiceCard
							title="Yes"
							subtitle="I have consistent sensory connections"
							selected={state.definition === "yes"}
							onClick={() => updateState({ definition: "yes" })}
							compact
						/>
						<ChoiceCard
							title="Maybe"
							subtitle="I'm not sure if my experiences qualify"
							selected={state.definition === "maybe"}
							onClick={() => updateState({ definition: "maybe" })}
							compact
						/>
					</div>
					<ChoiceCard
						variant="negative"
						title="No — I don't experience this"
						subtitle="I don't have these sensory connections"
						selected={state.definition === "no"}
						onClick={() => updateState({ definition: "no" })}
						compact
					/>
				</div>

				<div style={compactActionsStyle}>
					<Button
						variant="secondary"
						onClick={() => scrollToSection(0)}
						disabled={saving}
						style={{ fontSize: "1.125rem", padding: "0.75rem 1.5rem" }}
					>
						← Back
					</Button>
					<Button
						onClick={handleStep1Next}
						disabled={!isStepAccessible(1) || !state.definition || saving}
						style={{ fontSize: "1.125rem", padding: "0.75rem 1.5rem" }}
					>
						{saving ? "Saving…" : "Save & Continue →"}
					</Button>
				</div>
			</div>

			{/* Step 2: Type Selection */}
			<div ref={sectionRefs[2]} style={sectionStyle(2)}>
				<h2 style={compactTitleStyle}>Step 3: Select Your Synesthesia Types</h2>

				<ul
					className="type-rows compact"
					style={{ fontSize: "1.125rem", margin: 0 }}
				>
					<TypeRow
						title="Letter • Color"
						description='Letters/numbers evoke colors (e.g., "A" is red).'
						name="grapheme"
						value={state.synTypes.grapheme}
						onChange={(value) => handleSynTypesChange("grapheme", value)}
						compact
					/>
					<TypeRow
						title="Music/Sound • Color"
						description="Notes or sounds evoke colors."
						name="music"
						value={state.synTypes.music}
						onChange={(value) => handleSynTypesChange("music", value)}
						compact
					/>
					<TypeRow
						title="Lexical/Word • Taste"
						description="Words evoke tastes."
						name="lexical"
						value={state.synTypes.lexical}
						onChange={(value) => handleSynTypesChange("lexical", value)}
						compact
					/>
					<TypeRow
						title="Sequence • Space"
						description="Days/months have spatial layouts."
						name="sequence"
						value={state.synTypes.sequence}
						onChange={(value) => handleSynTypesChange("sequence", value)}
						compact
					/>
				</ul>

				<input
					id="other-experiences"
					className="other-input"
					type="text"
					placeholder="Other experiences (optional)"
					value={state.otherExperiences}
					onChange={(e) => updateState({ otherExperiences: e.target.value })}
					style={{
						fontSize: "1rem",
						padding: "0.625rem 1rem",
						marginTop: "0.5rem",
					}}
				/>

				<div style={compactActionsStyle}>
					<Button
						variant="secondary"
						onClick={() => scrollToSection(1)}
						disabled={saving}
						style={{ fontSize: "1.125rem", padding: "0.75rem 1.5rem" }}
					>
						← Back
					</Button>
					<Button
						onClick={handleStep2Next}
						disabled={!isStepAccessible(2) || saving}
						style={{ fontSize: "1.125rem", padding: "0.75rem 1.5rem" }}
					>
						{saving ? "Processing…" : "Submit & Continue →"}
					</Button>
				</div>
			</div>

			{/* Step 3: Results */}
			<div ref={sectionRefs[3]} style={sectionStyle(3)}>
				<h2 style={sectionTitleStyle}>Step 4: Your Results</h2>

				{!isStepAccessible(3) && (
					<p style={textStyle}>
						Complete the previous steps to see your results.
					</p>
				)}

				{isStepAccessible(3) && !summary && (
					<p style={textStyle}>Fetching your assigned tests…</p>
				)}

				{isStepAccessible(3) && summary && (
					<>
						<p
							style={{
								...textStyle,
								fontSize: "1.625rem",
								fontWeight: 600,
								color: summary.eligible ? "#065f46" : "#374151",
							}}
						>
							{summary.eligible
								? "✓ You qualify for the next phase of testing!"
								: "Screening complete."}
						</p>

						{summarySelectedTypes.length > 0 ? (
							<div
								className="summary-note"
								style={{ marginBottom: "1.5rem", padding: "1.25rem 1.75rem" }}
							>
								<div
									className="note-title"
									style={{ fontSize: "1.375rem", marginBottom: "1rem" }}
								>
									Selected types
								</div>
								<ul className="summary-list" style={{ fontSize: "1.375rem" }}>
									{summarySelectedTypes.map((type) => (
										<li key={type}>{type}</li>
									))}
								</ul>
							</div>
						) : (
							<p style={mutedTextStyle}>No eligible types recorded.</p>
						)}

						{summaryRecommendations.length > 0 && (
							<>
								<div
									className="summary-title mt-3"
									style={{
										fontSize: "1.5rem",
										fontWeight: 600,
										marginBottom: "1rem",
									}}
								>
									Recommended Tests
								</div>
								<div className="summary-grid" style={{ gap: "1rem" }}>
									{summaryRecommendations.map((rec, idx) => (
										<div
											className="summary-card"
											key={`${rec.name}-${idx}`}
											style={{ padding: "1.5rem" }}
										>
											<div
												className="summary-title"
												style={{ fontSize: "1.375rem" }}
											>
												{rec.name}
											</div>
											{rec.reason && (
												<div
													className="summary-sub"
													style={{ fontSize: "1.125rem" }}
												>
													{rec.reason}
												</div>
											)}
										</div>
									))}
								</div>
							</>
						)}

						<div style={actionsStyle}>
							<Button
								variant="secondary"
								onClick={() => scrollToSection(2)}
								disabled={saving}
								style={{ fontSize: "1.375rem", padding: "1rem 2.25rem" }}
							>
								← Back
							</Button>
							<Button
								onClick={startAssignedTests}
								disabled={!summary?.eligible}
								style={{ fontSize: "1.375rem", padding: "1rem 2.25rem" }}
							>
								Begin Assigned Tests →
							</Button>
						</div>
					</>
				)}
			</div>

			<p style={{ ...mutedTextStyle, textAlign: "center", marginTop: "3rem" }}>
				Questions? <a href="mailto:support@syntest.org">Contact support</a>
			</p>
		</div>
	);

	const startAssignedTests = () => {
		clearState();
		resetSummary();
		navigate("/participant/dashboard");
	};

	const summarySelectedTypes =
		summary?.selected_types || summary?.selectedTypes || [];
	const summaryRecommendations =
		summary?.recommended || summary?.recommended_tests || [];

	const handleConsentSubmit = () => {
		if (!state.consent || saving) {
			return;
		}
		withSaving(async () => {
			await screeningService.saveConsent(state.consent);
			navigate("/screening/1");
		});
	};

	const handleStep1Next = () => {
		withSaving(async () => {
			await screeningService.saveStep1(state.health);
			if (hasHealthExclusions) {
				resetSummary();
				navigate("/screening/exit/BC");
			} else {
				navigate("/screening/2");
			}
		});
	};

	const handleStep2Next = () => {
		if (!state.definition) {
			setError("Select the option that best fits you to continue.");
			return;
		}
		withSaving(async () => {
			await screeningService.saveStep2(state.definition);
			if (state.definition === "no") {
				resetSummary();
				navigate("/screening/exit/A");
			} else {
				navigate("/screening/3");
			}
		});
	};

	const handleStep3Next = () => {
		if (!state.pain) {
			setError("Select an option to continue.");
			return;
		}
		withSaving(async () => {
			await screeningService.saveStep3(state.pain);
			if (state.pain === "yes") {
				resetSummary();
				navigate("/screening/exit/D");
			} else {
				navigate("/screening/4");
			}
		});
	};

	const handleStep4Next = () => {
		// Prevent multiple clicks while saving
		if (saving) {
			return;
		}
		// Always save step 4 data before navigating, even if no eligible types
		// This ensures the database has the complete screening data for analysis
		withSaving(async () => {
			try {
				await screeningService.saveStep4(
					state.synTypes,
					state.otherExperiences,
				);
				if (!hasEligibleType) {
					// Finalize to determine exit code, then navigate to exit page
					const result = await screeningService.finalize();
					resetSummary();
					if (result?.exit_code) {
						navigate(`/screening/exit/${result.exit_code}`);
					} else {
						navigate("/screening/exit/NONE");
					}
				} else {
					resetSummary();
					navigate("/screening/5");
				}
			} catch (err) {
				// Error is already handled by withSaving, but ensure we don't navigate on error
				console.error("Step 4 save failed:", err);
				// Don't navigate if there's an error - let user retry
				throw err;
			}
		});
	};

	// Step 0: Intro
	if (step === 0) {
		return (
			<ScreeningStep
				step={0}
				totalSteps={5}
				title="Take the questionnaire"
				showActions={false}
				error={error}
			>
				<p className="lead">
					In this first screening, we'll check basic eligibility and your
					experiences.
				</p>

				<label className="checkbox-group" htmlFor="consent">
					<input
						id="consent"
						type="checkbox"
						checked={state.consent}
						onChange={(e) => updateState({ consent: e.target.checked })}
						data-audit-label="Consent agreement"
					/>
					<span>I consent to take part in this study.</span>
				</label>

				<p className="text-muted mb-3">
					By checking this box, you acknowledge that you have read and
					understood the study information sheet, agree to participate
					voluntarily, and consent to the collection and use of your data for
					research purposes. You may withdraw at any time without penalty.
				</p>

				<Button
					id="begin-screening"
					className="btn-block"
					disabled={!state.consent || saving}
					onClick={handleConsentSubmit}
				>
					{saving ? "Saving…" : "Begin screening"}
				</Button>
			</ScreeningStep>
		);
	}

	// Step 1: Health & Substances
	if (step === 1) {
		return (
			<ScreeningStep
				step={1}
				totalSteps={5}
				chip={{ label: "Health & Substances", variant: "primary" }}
				title="Confirm none apply to you:"
				onNext={handleStep1Next}
				nextLabel={hasHealthExclusions ? "Exit study" : "Continue"}
				loading={saving}
				error={error}
			>
				<Checkbox
					children="Use of recreational drugs including marijuana, LSD, or psychedelics"
					checked={state.health.drug}
					onChange={(e) => handleHealthChange("drug", e.target.checked)}
					data-audit-label="Substance exclusion — recreational drugs"
				/>
				<Checkbox
					children="Neurological condition or treatment affecting perception"
					checked={state.health.neuro}
					onChange={(e) => handleHealthChange("neuro", e.target.checked)}
					data-audit-label="Substance exclusion — neurological condition"
				/>
				<Checkbox
					children="Medical treatment impacting perception (e.g., brain tumor) or hallucinogenic physiology"
					checked={state.health.medical}
					onChange={(e) => handleHealthChange("medical", e.target.checked)}
					data-audit-label="Substance exclusion — medical treatment"
				/>
				<p className="text-muted">If any are checked, you're not eligible.</p>
			</ScreeningStep>
		);
	}

	// Step 2: Definition
	if (step === 2) {
		return (
			<ScreeningStep
				step={2}
				totalSteps={5}
				chip={{ label: "Definition", variant: "info" }}
				title="What is synesthesia?"
				onNext={handleStep2Next}
				nextLabel="Continue"
				nextDisabled={!state.definition || saving}
				loading={saving}
				error={error}
			>
				<p>
					Synesthesia is a neurological condition where stimulation of{" "}
					<em>one</em> sense automatically triggers a perception in another
					sense. It's not a metaphor, a mood-based association, or a one-time
					experience—it's a consistent, involuntary sensory connection that
					occurs throughout a person's life.
				</p>

				<div className="grid-2">
					<div>
						<div className="label-uppercase">DO</div>
						<ul className="arrow-list">
							<li>
								<span className="arrow"></span> Letters → Colors
							</li>
							<li>
								<span className="arrow"></span> Music → Colors
							</li>
							<li>
								<span className="arrow"></span> Words → Tastes
							</li>
						</ul>
					</div>
					<div>
						<div className="label-uppercase">DON'T</div>
						<ul className="plain-list">
							<li>Mnemonics</li>
							<li>Guesses</li>
							<li>Random choices</li>
						</ul>
					</div>
				</div>

				<div className="choice-grid">
					<ChoiceCard
						title="Yes"
						subtitle="I experience consistent sensory connections"
						selected={state.definition === "yes"}
						onClick={() => updateState({ definition: "yes" })}
						data-audit-label="Definition choice — yes"
					/>
					<ChoiceCard
						title="Maybe"
						subtitle="I'm not sure if my experiences qualify"
						selected={state.definition === "maybe"}
						onClick={() => updateState({ definition: "maybe" })}
						data-audit-label="Definition choice — maybe"
					/>
				</div>
				<ChoiceCard
					variant="negative"
					title="No — exit per criterion A"
					subtitle="I don't experience these sensory connections"
					selected={state.definition === "no"}
					onClick={() => updateState({ definition: "no" })}
					data-audit-label="Definition choice — no"
				/>
			</ScreeningStep>
		);
	}

	// Step 3: Pain & Emotion
	if (step === 3) {
		return (
			<ScreeningStep
				step={3}
				totalSteps={5}
				chip={{ label: "Pain & Emotion", variant: "info" }}
				title="Are your triggers pain or emotions?"
				onNext={handleStep3Next}
				nextLabel={state.pain === "yes" ? "Exit study" : "Continue"}
				nextDisabled={!state.pain}
				loading={saving}
				error={error}
			>
				<p>
					For ethical and replicability reasons, we must exclude synesthetic
					experiences that are primarily triggered by pain or strong emotions.
					We're looking for consistent, automatic associations with neutral
					stimuli.
				</p>

				<div className="info-panel">
					<ul className="info-rows">
						<li>
							<span className="i bolt"></span>
							<span className="info-label">Pain</span>
							<span className="info-text">→ flashes of light or color</span>
						</li>
						<li>
							<span className="i heart"></span>
							<span className="info-label">Emotion</span>
							<span className="info-text">→ specific tastes or smells</span>
						</li>
						<li>
							<span className="i dot"></span>
							<span className="info-label">Valid example:</span>
							<span className="info-text">
								The neutral word "Tuesday" consistently tastes sweet
							</span>
						</li>
					</ul>
				</div>

				<div className="select-list">
					<label className="select-card">
						<input
							type="radio"
							name="pain_emotion"
							value="yes"
							checked={state.pain === "yes"}
							onChange={(e) => updateState({ pain: e.target.value })}
							data-audit-label="Pain/emotion trigger — yes"
						/>
						<div className="select-body">
							<div className="select-title">Yes</div>
							<div className="select-subtitle">
								My experiences are primarily triggered by pain or strong
								emotions (exit per criterion D)
							</div>
						</div>
					</label>
					<label className="select-card">
						<input
							type="radio"
							name="pain_emotion"
							value="no"
							checked={state.pain === "no"}
							onChange={(e) => updateState({ pain: e.target.value })}
							data-audit-label="Pain/emotion trigger — no"
						/>
						<div className="select-body">
							<div className="select-title">No</div>
							<div className="select-subtitle">
								My experiences occur with neutral stimuli
							</div>
						</div>
					</label>
				</div>
			</ScreeningStep>
		);
	}

	// Step 4: Type Selection
	if (step === 4) {
		return (
			<ScreeningStep
				step={4}
				totalSteps={5}
				chip={{ label: "Type Selection", variant: "success" }}
				title="Select any types you experience"
				onNext={handleStep4Next}
				nextLabel="Continue"
				loading={saving}
				error={error}
			>
				<ul className="type-rows">
					<TypeRow
						title="Letter • Color"
						description='Letters/numbers evoke specific colors (e.g., "A" is red).'
						name="grapheme"
						value={state.synTypes.grapheme}
						onChange={(value) => handleSynTypesChange("grapheme", value)}
					/>
					<TypeRow
						title="Music/Sound • Color"
						description="Single notes or dyads evoke colors (70 tones testable)."
						name="music"
						value={state.synTypes.music}
						onChange={(value) => handleSynTypesChange("music", value)}
					/>
					<TypeRow
						title="Lexical/Word • Taste"
						description="Words evoke tastes via the 5 basic tastes."
						name="lexical"
						value={state.synTypes.lexical}
						onChange={(value) => handleSynTypesChange("lexical", value)}
					/>
					<TypeRow
						title="Sequence • Space"
						description="Days, months, or years have fixed spatial layouts."
						name="sequence"
						value={state.synTypes.sequence}
						onChange={(value) => handleSynTypesChange("sequence", value)}
					/>
				</ul>

				<input
					id="other-experiences"
					className="other-input"
					type="text"
					placeholder="Other synesthetic experiences (optional)"
					value={state.otherExperiences}
					onChange={(e) => updateState({ otherExperiences: e.target.value })}
					data-mask="true"
					data-audit-label="Other synesthetic experiences free-text"
				/>
				<p className="text-muted">
					Only types with available tasks proceed; pain/emotion triggers
					excluded.
				</p>
			</ScreeningStep>
		);
	}

	// Step 5: Routing Summary
	if (step === 5) {
		return (
			<ScreeningStep
				step={5}
				totalSteps={5}
				chip={{ label: "Routing", variant: "info" }}
				title="Your next step"
				nextLabel="Begin assigned tests"
				onNext={startAssignedTests}
				nextDisabled={!summary?.eligible}
				loading={saving}
				error={error}
			>
				{!summary && <p>Fetching your assigned tests…</p>}

				{summary && (
					<>
						<p className="lead">
							{summary.eligible
								? "You qualify for the next phase of testing."
								: "Screening complete."}
						</p>

						{summarySelectedTypes.length > 0 ? (
							<div className="summary-note">
								<div className="note-title">Selected types</div>
								<ul className="summary-list">
									{summarySelectedTypes.map((type) => (
										<li key={type}>{type}</li>
									))}
								</ul>
							</div>
						) : (
							<p className="text-muted">No eligible types recorded.</p>
						)}

						{summaryRecommendations.length > 0 && (
							<>
								<div className="summary-title mt-3">Recommended next steps</div>
								<div className="summary-grid">
									{summaryRecommendations.map((rec, idx) => (
										<div className="summary-card" key={`${rec.name}-${idx}`}>
											<div className="summary-title">{rec.name}</div>
											{rec.reason && (
												<div className="summary-sub">{rec.reason}</div>
											)}
										</div>
									))}
								</div>
							</>
						)}
					</>
				)}
			</ScreeningStep>
		);
	}

	return null;
}
