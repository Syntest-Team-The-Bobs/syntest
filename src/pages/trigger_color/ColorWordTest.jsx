import React from 'react';
import BaseColorTest from '../../components/trigger_color/BaseColor';
import { buildWordDecks } from '../../hooks/useDeck';

/**
 * Word-Color Synesthesia Test Configuration
 * Defines test content and instructions for word-color associations
 */
const WORD_CONFIG = {
  title: 'Word-Color Synesthesia Test',
  description: 'In this test, you will see words one at a time. For each word, select the color you most strongly associate with it.',
  instructions: [
    'Each word will appear 3 times to test consistency',
    'Try to select the same color each time for each word',
    'Click and hold on the color wheel to select your color',
    'Take your time - there is no time limit per word'
  ],
  estimatedTime: '4-6 minutes'
};

/**
 * ColorWordTest - Page component for word-color synesthesia test
 * 
 * Responsibilities:
 * - Configures test with word-specific settings
 * - Delegates all test logic to BaseColorTest
 * - Provides word stimuli via buildWordDecks service
 */
export default function ColorWordTest() {
  // Build word stimulus deck
  const { stimuli, practiceStimuli } = buildWordDecks();

  return (
    <BaseColorTest
      testType="word"
      stimuli={stimuli}
      practiceStimuli={practiceStimuli}
      title="WORD COLOR TEST"
      introConfig={WORD_CONFIG}
    />
  );
}
