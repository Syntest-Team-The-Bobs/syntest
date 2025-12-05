import React from 'react';
import BaseColorTest from '../../components/trigger_color/BaseColor';
import { buildMusicDecks } from '../../services/deck';

/**
 * Music-Color Synesthesia Test Configuration
 * 
 * Test Structure:
 * - 70 musical stimuli (Ward et al., 2006 specifications)
 * - 3 trials per stimulus for consistency testing
 * - Mix of single notes, dyads, and various instruments
 * - Estimated completion time: 4-6 minutes
 */
const MUSIC_CONFIG = {
  title: 'Music-Color Synesthesia Test',
  description: 'In this test, you will hear musical notes or chords. For each sound, select the color you most strongly associate with it.',
  instructions: [
    'Each sound will be played 3 times to test consistency',
    'Try to select the same color each time for each sound',
    'You can replay the sound as many times as needed',
    'Click and hold on the color wheel to select your color',
    'Take your time - there is no time limit per sound'
  ],
  estimatedTime: '4-6 minutes'
};

/**
 * ColorMusicTest - Page component for music-color synesthesia test
 * 
 * Responsibilities:
 * - Configures test with music-specific settings
 * - Delegates all test logic to BaseColorTest
 * - Provides music stimuli via buildMusicDecks service
 * 
 */
export default function ColorMusicTest() {
  // Build music stimulus deck with all 70 stimuli
  const { stimuli, practiceStimuli } = buildMusicDecks();

  return (
    <BaseColorTest
      testType="music"
      stimuli={stimuli}
      practiceStimuli={practiceStimuli}
      title="MUSIC COLOR TEST"
      introConfig={MUSIC_CONFIG}
    />
  );
}
