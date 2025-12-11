import { useCallback, useRef, useState } from "react";

/**
 * useStepTimer - Custom hook for tracking time spent on each screening step
 *
 * Features:
 * - Records timestamps when steps are started/completed
 * - Calculates duration for each step in milliseconds
 * - Tracks total screening duration
 * - Provides timing data for analytics submission
 *
 * Usage:
 *   const { startStep, completeStep, getStepDuration, getTotalDuration, getTimingData } = useStepTimer();
 *   startStep(0);  // Call when entering step 0
 *   completeStep(0);  // Call when leaving step 0
 *   const duration = getStepDuration(0);  // Get time spent on step 0
 */
export default function useStepTimer() {
	// Store start times for each step
	const stepStartTimes = useRef({});
	// Store completion times for each step
	const stepEndTimes = useRef({});
	// Track when screening started overall
	const screeningStartTime = useRef(null);
	// Track current active step
	const [activeStep, setActiveStep] = useState(null);

	/**
	 * Start timing a step
	 * @param {number} stepNum - The step number (0-3)
	 */
	const startStep = useCallback((stepNum) => {
		const now = Date.now();

		// Set screening start time on first step
		if (screeningStartTime.current === null) {
			screeningStartTime.current = now;
		}

		// Only set start time if not already set (avoid resetting on re-visits)
		if (!stepStartTimes.current[stepNum]) {
			stepStartTimes.current[stepNum] = now;
		}

		setActiveStep(stepNum);
	}, []);

	/**
	 * Mark a step as completed and record end time
	 * @param {number} stepNum - The step number (0-3)
	 */
	const completeStep = useCallback((stepNum) => {
		const now = Date.now();
		stepEndTimes.current[stepNum] = now;

		// Clear active step if it matches
		setActiveStep((current) => (current === stepNum ? null : current));
	}, []);

	/**
	 * Get duration for a specific step in milliseconds
	 * @param {number} stepNum - The step number
	 * @returns {number|null} Duration in ms, or null if step not completed
	 */
	const getStepDuration = useCallback((stepNum) => {
		const start = stepStartTimes.current[stepNum];
		const end = stepEndTimes.current[stepNum];

		if (!start) return null;
		if (!end) {
			// Step in progress - return current duration
			return Date.now() - start;
		}

		return end - start;
	}, []);

	/**
	 * Get total screening duration from first step start to now
	 * @returns {number|null} Total duration in ms, or null if not started
	 */
	const getTotalDuration = useCallback(() => {
		if (!screeningStartTime.current) return null;
		return Date.now() - screeningStartTime.current;
	}, []);

	/**
	 * Get formatted timing data for analytics submission
	 * @returns {Object} Timing data object ready for API submission
	 */
	const getTimingData = useCallback(() => {
		const steps = {};
		const stepNames = ["consent", "definition", "types", "results"];

		for (let i = 0; i < 4; i++) {
			const start = stepStartTimes.current[i];
			const end = stepEndTimes.current[i];

			if (start) {
				steps[stepNames[i]] = {
					step_num: i,
					started_at: new Date(start).toISOString(),
					completed_at: end ? new Date(end).toISOString() : null,
					duration_ms: end ? end - start : null,
				};
			}
		}

		return {
			screening_started_at: screeningStartTime.current
				? new Date(screeningStartTime.current).toISOString()
				: null,
			total_duration_ms: getTotalDuration(),
			steps,
		};
	}, [getTotalDuration]);

	/**
	 * Format duration for display (e.g., "2m 30s")
	 * @param {number} ms - Duration in milliseconds
	 * @returns {string} Formatted duration string
	 */
	const formatDuration = useCallback((ms) => {
		if (ms === null || ms === undefined) return "--";

		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;

		if (minutes > 0) {
			return `${minutes}m ${remainingSeconds}s`;
		}
		return `${remainingSeconds}s`;
	}, []);

	/**
	 * Reset all timing data (useful for restarting screening)
	 */
	const resetTimer = useCallback(() => {
		stepStartTimes.current = {};
		stepEndTimes.current = {};
		screeningStartTime.current = null;
		setActiveStep(null);
	}, []);

	return {
		// Actions
		startStep,
		completeStep,
		resetTimer,

		// Getters
		getStepDuration,
		getTotalDuration,
		getTimingData,
		formatDuration,

		// State
		activeStep,
	};
}
