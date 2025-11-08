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

  /** Configuration for intro screen shown before test begins. */
  getIntroConfig() {
    return {
      title: 'Number-Color Synesthesia Test',
      description: 'In this test, you will see numbers one at a time. For each number, select the color you most strongly associate with it.',
      instructions: [
        'Each number will appear 3 times to test consistency',
        'Try to select the same color each time for each number',
        'Click "No Color" if you don\'t associate a color with that number',
        'Take your time - there is no time limit per number'
      ],
      estimatedTime: '3-5 minutes'
    };
  }
}
