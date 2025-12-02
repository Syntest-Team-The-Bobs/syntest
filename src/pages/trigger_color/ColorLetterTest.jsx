import React from 'react';
import BaseColorTest from '../../components/trigger_color/BaseColor';
import { buildLetterDecks } from '../../hooks/useDeck';

/**
 * Letter-Color Synesthesia Test Configuration
 * Defines test content and instructions for letter-color associations
 */
const LETTER_CONFIG = {
  title: 'Letter-Color Synesthesia Test',
  description: 'In this test, you will see letters one at a time. For each letter, select the color you most strongly associate with it.',
  instructions: [
    'Each letter will appear 3 times to test consistency',
    'Try to select the same color each time for each letter',
    'Click and hold on the color wheel to select your color',
    'Take your time - there is no time limit per letter'
  ],
  estimatedTime: '3-5 minutes'
};

/**
 * ColorLetterTest - Page component for letter-color synesthesia test
 * 
 * Responsibilities:
 * - Configures test with letter-specific settings
 * - Delegates all test logic to BaseColorTest
 * - Provides letter stimuli via buildLetterDecks service
 */
export default function ColorLetterTest() {
  // Build letter stimulus deck (A-Z)
  const { stimuli, practiceStimuli } = buildLetterDecks();

  return (
    <BaseColorTest
      testType="letter"
      stimuli={stimuli}
      practiceStimuli={practiceStimuli}
      title="LETTER COLOR TEST"
      introConfig={LETTER_CONFIG}
    />
  );
}