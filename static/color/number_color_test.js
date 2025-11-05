// ============================================================
// SYNTEST — NumberColorTest
// Purpose: Concrete test that supplies 0–9 stimuli to BaseColorTest.
// Design (SOLID): Only provides stimuli + title; all logic lives in BaseColorTest.
// ============================================================

import { BaseColorTest } from "./base_color_test.js";

/**
 * NumberColorTest
 * Provides numeric labels "0"–"9" as the stimulus set.
 * BaseColorTest handles shuffling, repetitions, UI wiring, and scoring.
 */
export class NumberColorTest extends BaseColorTest {
  /** Return the labels shown to the participant. */
  getStimuliSet() {
    // -> ["0","1","2","3","4","5","6","7","8","9"]
    return Array.from({ length: 10 }, (_, i) => String(i));
  }

  /** Human-readable title for summaries and headers. */
  getTitle() {
    return "NUMBER COLOR TEST";
  }
}
