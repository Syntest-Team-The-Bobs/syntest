import { useMemo, useState } from "react";
import { buildDeck } from "../services/deck";
import { useDeck } from "./useDeck";

/**
 * useColorTest - Custom hook for managing color synesthesia test state and logic
 *
 * Responsibilities:
 * - Manages test flow phases (intro → testing → done)
 * - Handles color selection and locking state
 * - Manages trial progression and response recording
 * - Coordinates with deck management for stimulus presentation
 *
 */
export function useColorTest(stimuli, practiceStimuli, onComplete) {
	// Test phase state: "intro" | "practice" | "testing" | "done"
	const [phase, setPhase] = useState("intro");

	// Color selection state
	const [selected, setSelected] = useState(null); // {r, g, b, hex, canvasX, canvasY}
	const [locked, setLocked] = useState(false);
	const [noExperience, setNoExperience] = useState(false);

	// Response tracking
	const [responses, setResponses] = useState([]);

	// Stable keys for useMemo dependencies (prevents deck rebuilding on every render)
	const stimuliKey = JSON.stringify(stimuli);
	const practiceKey = JSON.stringify(practiceStimuli);

	// Build decks with 3 repetitions per stimulus
	const practiceDeck = useMemo(
		() => buildDeck(practiceStimuli, 3),
		[practiceKey],
	);
	const testDeck = useMemo(() => buildDeck(stimuli, 3), [stimuliKey]);

	// Initialize deck state managers
	const practice = useDeck(practiceDeck);
	const test = useDeck(testDeck);

	// Select active deck based on current phase
	const active =
		phase === "practice" ? practice : phase === "testing" ? test : practice;
	const { deck, idx, setIdx, start, reactionMs, next } = active;
	const current = deck[idx];

	/**
	 * Handles color selection from color wheel
	 * Prevents selection changes when locked
	 */
	function onPick(c) {
		if (locked) return;
		setSelected({
			r: c.r,
			g: c.g,
			b: c.b,
			hex: c.hex,
			canvasX: c.x,
			canvasY: c.y,
		});
	}

	/**
	 * Toggles lock state of current color selection
	 * Requires a color to be selected first
	 */
	function toggleLock() {
		if (!selected) return;
		setLocked((v) => !v);
	}

	/**
	 * Toggles no synesthetic experience state
	 */
	function toggleNoExperience() {
		setNoExperience((v) => !v);
	}

	/**
	 * Prepares for next stimulus presentation
	 * Resets selection state and starts reaction timer
	 */
	function present() {
		setSelected(null);
		setLocked(false);
		setNoExperience(false);
		start();
	}

	/**
	 * Initiates the main test (skips practice)
	 * Resets deck and response tracking
	 */
	function startTest() {
		setPhase("testing");
		test.setIdx(0);
		setResponses([]);
		setTimeout(() => present(), 0);
	}

	/**
	 * Records a trial response to the responses array
	 * Returns updated responses array
	 */
	function recordResponse(trial) {
		const newResponses = [...responses, trial];
		setResponses(newResponses);
		return newResponses;
	}

	/**
	 * Advances to next trial or completes test
	 *
	 * Flow:
	 * 1. Validates selection is locked OR no experience is checked
	 * 2. Records response (if in testing phase)
	 * 3. Either advances to next stimulus or completes test
	 * 4. Invokes onComplete callback with final responses
	 *
	 * @returns {Object} - Status object with shouldContinue and optional finalResponses
	 */
	async function handleNext() {
		// Require locked selection OR no experience before proceeding
		if (!noExperience && (!selected || !locked))
			return { shouldContinue: true };

		// Build trial data object
		const trial = {
			stimulus: current.stimulus,
			selectedColor: noExperience ? null : selected,
			noSynestheticExperience: noExperience,
			reactionTime: reactionMs(),
		};

		// Record response only during testing phase (not practice)
		const newResponses =
			phase === "testing" ? recordResponse(trial) : responses;

		// Reset selection state for next trial
		setSelected(null);
		setLocked(false);
		setNoExperience(false);

		// Check if more stimuli remain in deck
		if (idx < deck.length - 1) {
			next();
			present();
			return { shouldContinue: true };
		} else {
			// Test complete
			setPhase("done");
			if (onComplete) {
				await onComplete(newResponses);
			}
			return { shouldContinue: false, finalResponses: newResponses };
		}
	}

	// Return state and action functions for component consumption
	return {
		// State
		phase,
		setPhase,
		selected,
		locked,
		noExperience,
		responses,
		deck,
		idx,
		current,
		stimuli,
		practiceStimuli,

		// Actions
		onPick,
		toggleLock,
		toggleNoExperience,
		startTest,
		handleNext,
	};
}
