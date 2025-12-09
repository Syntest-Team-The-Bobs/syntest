import { useEffect, useCallback } from 'react';
import { musicPlayer } from '../services/audioPlayer';

/**
 * useMusicPlayer - Manages music test audio playback
 * 
 * Extracts all music playback logic from BaseColor.jsx
 * Handles auto-play, cleanup, and replay functionality
 * 
 * @param {string} testType - The type of test ('music', 'letter', 'number', 'word')
 * @param {object} current - Current stimulus object with .stimulus property
 * @param {string} phase - Current phase of the test ('intro', 'practice', 'test', 'done')
 * @returns {object} - { handleReplay }
 */
export function useMusicPlayer(testType, current, phase) {
  // Auto-play music stimulus when it changes
  useEffect(() => {
    if (testType === 'music' && current && phase !== 'intro' && phase !== 'done') {
      (async () => {
        try {
          await musicPlayer.play(current.stimulus);
        } catch (error) {
          console.error('Failed to play audio:', error);
        }
      })();
    }
  }, [testType, current, phase]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (testType === 'music') {
        musicPlayer.stop();
      }
    };
  }, [testType]);

  // Replay handler
  const handleReplay = useCallback(async () => {
    if (testType === 'music' && current) {
      try {
        await musicPlayer.play(current.stimulus);
      } catch (error) {
        console.error('Failed to play audio:', error);
      }
    }
  }, [testType, current]);

  return { handleReplay };
}