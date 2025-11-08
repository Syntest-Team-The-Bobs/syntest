// ============================================================
// SYNTEST — LetterColorTest
// Purpose: Concrete test that supplies A–Z stimuli to BaseColorTest
// ============================================================

import { BaseColorTest } from "./base_color_test.js";

/**
 * LetterColorTest
 * Supplies uppercase A–Z as the stimulus set for the color test.
 */
export class LetterColorTest extends BaseColorTest {
  /**
   * Return the ordered list of labels shown to the participant.
   * BaseColorTest handles shuffling and repetition per trial.
   */
  getStimuliSet() {
    // Generate ["A", "B", ..., "Z"]
    return Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  }

  /**
   * Human-readable title surfaced in summaries/UI.
   */
  getTitle() {
    return "LETTER COLOR TEST";
  }

  getIntroConfig() {
    return {
      title: 'Letter-Color Synesthesia Test',
      description: 'In this test, you will see letters one at a time. For each letter, select the color you most strongly associate with it.',
      instructions: [
        'Each letter will appear 3 times to test consistency',
        'Try to select the same color each time for each letter',
        'Click "No Color" if you don\'t associate a color with that letter',
        'Take your time - there is no time limit per letter'
      ],
      estimatedTime: '5-10 minutes'
    };
  }
}
