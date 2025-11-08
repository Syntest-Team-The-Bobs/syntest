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

  /** Configuration for intro screen shown before test begins. */
  getIntroConfig() {
    return {
      title: 'Word-Color Synesthesia Test',
      description: 'In this test, you will see words one at a time. For each word, select the color you most strongly associate with it.',
      instructions: [
        'Each word will appear 3 times to test consistency',
        'Try to select the same color each time for each word',
        'Click "No Color" if you don\'t associate a color with that word',
        'Take your time - there is no time limit per word'
      ],
      estimatedTime: '4-6 minutes'
    };
  }
}
