import React from 'react';
import BaseColorTest from '../../components/trigger_color/BaseColor';
import { buildNumberDecks } from '../../hooks/useDeck';

/**
 * Number-Color Synesthesia Test Configuration
 * Defines test content and instructions for number-color associations
 */
const NUMBER_CONFIG = {
  title: 'Number-Color Synesthesia Test',
  description: 'In this test, you will see numbers one at a time. For each number, select the color you most strongly associate with it.',
  instructions: [
    'Each number will appear 3 times to test consistency',
    'Try to select the same color each time for each number',
    'Click and hold on the color wheel to select your color',
    'Take your time - there is no time limit per number'
  ],
  estimatedTime: '3-5 minutes'
};

/**
 * ColorNumberTest - Page component for number-color synesthesia test
 * 
 */
export default function ColorNumberTest() {
  // Build number stimulus deck (0-9)
  const { stimuli, practiceStimuli } = buildNumberDecks();

  return (
    <BaseColorTest
      testType="number"
      stimuli={stimuli}
      practiceStimuli={practiceStimuli}
      title="NUMBER COLOR TEST"
      introConfig={NUMBER_CONFIG}
    />
  );
}