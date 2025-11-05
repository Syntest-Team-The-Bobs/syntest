// ============================================================
// SYNTEST — WordColorTest
// Purpose: Provide a fixed set of words as stimuli to BaseColorTest.
// ============================================================

import { BaseColorTest } from "./base_color_test.js";

/**
 * WordColorTest
 * Returns a small, readable set of common words for color association.
 * All shuffling, repetition, UI wiring, timing, and scoring are handled by BaseColorTest.
 */
export class WordColorTest extends BaseColorTest {
  /** Labels shown to the participant. Keep them short and legible. */
  getStimuliSet() {
    return [
      "RED", "BLUE", "GREEN",
      "SUN", "MOON", "STAR",
      "DAY", "NIGHT",
      "CAT", "DOG", "APPLE",
      "MONDAY", "MUSIC", "WATER", "SALT"
    ];
  }

  /** Title used in headers and summary output. */
  getTitle() {
    return "WORD COLOR TEST";
  }
}
