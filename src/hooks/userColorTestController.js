/**
 * useColorTestController - Advanced test orchestration hook with dependency injection
 * 
 * Orchestrates all test logic and state management for color synesthesia tests.
 * Designed for extensibility via injected submit and metadata functions.
 * 
 * Responsibilities:
 * - Manages complete test lifecycle (intro → practice → testing → done)
 * - Handles color selection, locking, and trial progression
 * - Coordinates with deck management for stimulus presentation
 * - Submits results via injected service functions
 * - Provides computed UI helpers for progress tracking
 */

import { useMemo, useState } from "react";
import { buildDeck, useDeck } from "./useDeck";
import { colorService } from "./color";

export function useColorTestController({
  testType,
  stimuli,
  practiceStimuli,
  submitFn = colorService.submitColorTest,        // DI with defaults (OCP, DIP)
  metadataFn = colorService.calculateMetadata,    // DI with defaults (OCP, DIP)
}) {
  // Phase state machine: intro | practice | testing | ready | done
  const [phase, setPhase] = useState("intro");
  
  // Color selection state
  const [selected, setSelected] = useState(null);  // {r,g,b,hex,canvasX,canvasY}
  const [locked, setLocked] = useState(false);
  
  // Response tracking
  const [responses, setResponses] = useState([]);

  // Stable keys for memoization (prevents unnecessary deck rebuilds)
  const stimuliKey = JSON.stringify(stimuli);
  const practiceKey = JSON.stringify(practiceStimuli);

  // Build decks with 3 repetitions per stimulus
  const practiceDeck = useMemo(() => buildDeck(practiceStimuli, 3), [practiceKey]);
  const testDeck     = useMemo(() => buildDeck(stimuli, 3),          [stimuliKey]);

  // Initialize deck managers
  const practice = useDeck(practiceDeck);
  const test     = useDeck(testDeck);

  // Select active deck based on current phase
  const active = phase === "practice" ? practice : phase === "testing" ? test : practice;
  const { deck, idx, setIdx, start, reactionMs, next } = active;
  const current = deck[idx];

  /**
   * Prepares UI for next stimulus presentation
   * Resets selection state and starts reaction timer
   */
  function present() {
    setSelected(null);
    setLocked(false);
    start();
  }

  /**
   * Handles color selection from picker
   * Prevents changes when selection is locked
   */
  function setPick(c) {
    if (locked) return;
    setSelected({
      r: c.r, g: c.g, b: c.b, hex: c.hex,
      canvasX: c.x, canvasY: c.y,
    });
  }

  /**
   * Toggles lock state of current color selection
   * Requires a color to be selected first
   */
  function toggleLock() {
    if (!selected) return;
    setLocked(v => !v);
  }

  /**
   * Initiates practice phase
   * Resets deck position and response tracking
   */
  function startPractice() {
    setPhase("practice");
    setIdx(0);
    setResponses([]);
    setTimeout(present, 0);
  }

  /**
   * Initiates main test phase (skips practice)
   * Resets deck position and response tracking
   */
  function startTest() {
    setPhase("testing");
    test.setIdx(0);
    setResponses([]);
    setTimeout(present, 0);
  }

  /**
   * Submits final results and transitions to done phase
   * Uses injected submitFn and metadataFn for flexibility
   * 
   * @param {Array} finalTrials - Complete array of trial responses
   */
  async function finish(finalTrials) {
    try {
      await submitFn({
        testType: `color-${testType}`,
        participantId: null,
        trials: finalTrials,
        completedAt: new Date().toISOString(),
        metadata: metadataFn(finalTrials),
      });
    } catch (e) {
      console.error("Error submitting results:", e);
    }
    setPhase("done");
  }

  /**
   * Advances to next trial or completes current phase
   * 
   * Flow:
   * 1. Validates selection is locked
   * 2. Formats and records trial data (via injected formatTrial)
   * 3. Resets selection state
   * 4. Either advances to next stimulus or completes phase
   * 
   * @param {Function} formatTrial - Function to format trial data (DI pattern)
   */
  function handleNext(formatTrial) {
    if (!selected || !locked) return;

    // Format trial using injected function
    const trial = formatTrial(current, selected, reactionMs);
    
    // Record response only during testing phase
    const newResponses = phase === "testing" ? [...responses, trial] : responses;
    if (phase === "testing") setResponses(newResponses);

    // Reset selection state
    setSelected(null);
    setLocked(false);

    // Determine next action based on position
    if (idx < deck.length - 1) {
      // More stimuli remain - advance
      next();
      present();
    } else if (phase === "practice") {
      // Practice complete - transition to ready
      setPhase("ready");
    } else {
      // Test complete - submit and finish
      finish(newResponses);
    }
  }

  /**
   * Computed progress metrics for UI (ISP-friendly interface)
   * Memoized to prevent unnecessary recalculations
   */
  const totals = useMemo(() => {
    const total = deck.length || 0;
    const itemsPerTrial = phase === "practice" ? practiceStimuli.length : stimuli.length;
    const currentTrialNum = deck.length ? Math.floor(idx / itemsPerTrial) + 1 : 1;
    const progressInTrial = deck.length ? idx % itemsPerTrial : 0;
    return { total, itemsPerTrial, currentTrialNum, progressInTrial };
  }, [deck, idx, phase, practiceStimuli.length, stimuli.length]);

  // Return focused interface (ISP compliance)
  return {
    // State
    phase, 
    selected, 
    locked, 
    current, 
    reactionMs,
    deck, 
    idx, 
    totals,

    // Actions
    setPick, 
    toggleLock, 
    startPractice, 
    startTest, 
    handleNext,

    // Lifecycle
    present,
  };
}