import React, { useState, useEffect, useRef } from 'react';
import Soundfont from 'soundfont-player';

/**
 * MusicPlayer - Audio playback component for music-color synesthesia test
 * 
 * Responsibilities:
 * - Loads real instrument samples from Soundfont library (MusyngKite soundbank)
 * - Generates pure sine waves using Web Audio API for 'sine' instrument type
 * - Plays musical stimuli for exactly 3 seconds (Ward et al., 2006 spec)
 * - Supports single notes and dyads (two simultaneous notes)
 * - Allows users to stop playback by clicking play button again
 * - Notifies parent component of playing state to disable Next button during playback
 * 
 * 
 * Audio Implementation:
 * - Uses soundfont-player for sampled instruments (piano, strings, woodwinds, brass)
 * - Uses Web Audio API oscillators for pure sine waves (research requirement)
 * - Volume set to 40% (0.4 gain) for comfortable listening
 * - 3-second duration per research specifications
 * - Supports 13 different instruments from classical to electronic
 */
export default function MusicPlayer({ stimulus, onPlayingChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const instrumentRef = useRef(null);
  const audioContextRef = useRef(null);
  const activeNodesRef = useRef([]);
  const timeoutIdRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * Parse stimulus string into notes and instrument name
   * 
   * Examples:
   * - 'C4-piano' → { notes: ['C4'], instrumentName: 'piano' }
   * - 'C1+G1-string' → { notes: ['C1', 'G1'], instrumentName: 'string' }
   */
  const parseStimulus = (stim) => {
    const parts = stim.split('-');
    const instrumentName = parts[1] || 'piano';
    const notesPart = parts[0];
    const notes = notesPart.includes('+') ? notesPart.split('+') : [notesPart];
    return { notes, instrumentName };
  };

  /**
   * Track mounted state to prevent state updates after unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Load instrument samples when stimulus changes
   * Cleanup previous instrument to prevent memory leaks
   */
  useEffect(() => {
    loadInstrument();
    
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      stopSound();
      if (instrumentRef.current) {
        instrumentRef.current = null;
      }
    };
  }, [stimulus]);

  /**
   * Notify parent component when playing state changes
   * Used to disable Next button during playback
   */
  useEffect(() => {
    if (onPlayingChange) {
      onPlayingChange(isPlaying);
    }
  }, [isPlaying, onPlayingChange]);

  /**
   * Map instrument names to Soundfont instrument IDs
   * Uses real sampled instruments from MusyngKite soundbank via Gleitz CDN
   * 
   * NOTE: 'sine' returns null to trigger Web Audio API oscillator generation
   * 
   * Instrument mappings follow General MIDI standard naming conventions
   */
  const getInstrumentId = (instrumentName) => {
    const mapping = {
      'piano': 'acoustic_grand_piano',
      'string': 'cello',
      'violin': 'violin',
      'cello': 'cello',
      'flute': 'flute',
      'clarinet': 'clarinet',
      'trumpet': 'trumpet',
      'saxophone': 'alto_sax',
      'guitar': 'acoustic_guitar_nylon',
      'organ': 'church_organ',
      'oboe': 'oboe',
      'bassoon': 'bassoon',
      'sine': null  // Pure sine waves generated via Web Audio API, not sampled
    };
    return mapping[instrumentName] !== undefined ? mapping[instrumentName] : 'acoustic_grand_piano';
  };

  /**
   * Convert note name to frequency in Hz
   * Supports notes from C1 (32.70 Hz) to C7 (2093 Hz)
   * 
   * Used for pure sine wave generation via Web Audio API
   */
  const noteToFrequency = (note) => {
    const noteFrequencies = {
      // Octave 1
      'C1': 32.70, 'C#1': 34.65, 'Db1': 34.65, 'D1': 36.71, 'D#1': 38.89, 'Eb1': 38.89,
      'E1': 41.20, 'F1': 43.65, 'F#1': 46.25, 'Gb1': 46.25, 'G1': 49.00, 'G#1': 51.91,
      'Ab1': 51.91, 'A1': 55.00, 'A#1': 58.27, 'Bb1': 58.27, 'B1': 61.74,
      
      // Octave 2
      'C2': 65.41, 'C#2': 69.30, 'Db2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'Eb2': 77.78,
      'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'Gb2': 92.50, 'G2': 98.00, 'G#2': 103.83,
      'Ab2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'Bb2': 116.54, 'B2': 123.47,
      
      // Octave 3
      'C3': 130.81, 'C#3': 138.59, 'Db3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'Eb3': 155.56,
      'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'Gb3': 185.00, 'G3': 196.00, 'G#3': 207.65,
      'Ab3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'Bb3': 233.08, 'B3': 246.94,
      
      // Octave 4
      'C4': 261.63, 'C#4': 277.18, 'Db4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'Eb4': 311.13,
      'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'Gb4': 369.99, 'G4': 392.00, 'G#4': 415.30,
      'Ab4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16, 'B4': 493.88,
      
      // Octave 5
      'C5': 523.25, 'C#5': 554.37, 'Db5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'Eb5': 622.25,
      'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'Gb5': 739.99, 'G5': 783.99, 'G#5': 830.61,
      'Ab5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'Bb5': 932.33, 'B5': 987.77,
      
      // Octave 6
      'C6': 1046.50, 'C#6': 1108.73, 'Db6': 1108.73, 'D6': 1174.66, 'D#6': 1244.51, 'Eb6': 1244.51,
      'E6': 1318.51, 'F6': 1396.91, 'F#6': 1479.98, 'Gb6': 1479.98, 'G6': 1567.98, 'G#6': 1661.22,
      'Ab6': 1661.22, 'A6': 1760.00, 'A#6': 1864.66, 'Bb6': 1864.66, 'B6': 1975.53,
      
      // Octave 7
      'C7': 2093.00, 'C#7': 2217.46, 'Db7': 2217.46
    };
    return noteFrequencies[note] || 440.00; // Default to A4 if note not found
  };

  /**
   * Load instrument samples asynchronously from CDN
   * For 'sine' instrument, sets instrumentRef to 'sine' to trigger oscillator generation
   * 
   * Process:
   * 1. Initialize Web Audio API context
   * 2. Check if instrument is 'sine' (pure tone)
   * 3. If sine: mark as loaded without fetching samples
   * 4. If other: fetch instrument samples from Gleitz CDN
   */
  const loadInstrument = async () => {
    setIsLoading(true);
    
    try {
      // Initialize Web Audio API context (required for all audio playback)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const { instrumentName } = parseStimulus(stimulus);
      const instrumentId = getInstrumentId(instrumentName);
      
      // Pure sine waves don't need sample loading - use Web Audio API oscillators
      if (instrumentId === null) {
        console.log('Using pure sine wave oscillator');
        instrumentRef.current = 'sine'; // Mark as sine wave generator
        setIsLoading(false);
        return;
      }
      
      console.log('Loading instrument:', instrumentId);
      
      // Load instrument samples from CDN
      const instrument = await Soundfont.instrument(
        audioContextRef.current,
        instrumentId,
        {
          format: 'mp3',
          soundfont: 'MusyngKite',  // High-quality soundbank
          nameToUrl: (name, soundfont, format) => {
            return `https://gleitz.github.io/midi-js-soundfonts/${soundfont}/${name}-${format}.js`;
          }
        }
      );
      
      instrumentRef.current = instrument;
      setIsLoading(false);
      console.log('Instrument loaded successfully');
      
    } catch (error) {
      console.error('Error loading instrument:', error);
      setIsLoading(false);
    }
  };

  /**
   * Stop currently playing sound immediately
   * Cleans up all active audio nodes to prevent overlap
   */
  const stopSound = () => {
    // Stop all active audio nodes
    activeNodesRef.current.forEach(node => {
      try {
        if (node.stop) {
          node.stop();
        }
      } catch (e) {
        // Node may already be stopped - ignore error
      }
    });
    activeNodesRef.current = [];
    
    if (isMountedRef.current) {
      setIsPlaying(false);
    }
  };

  /**
   * Generate pure sine wave using Web Audio API oscillator
   * Used for 'sine' instrument type as per research specifications
   * 
   * @param {string} note - Note name (e.g., 'C4', 'A2')
   * @param {number} startTime - Audio context time to start playback
   * @param {number} duration - Duration in seconds (3s per research spec)
   */
  const playSineWave = (note, startTime, duration) => {
    const frequency = noteToFrequency(note);
    
    // Create oscillator node for pure sine wave
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    // Connect oscillator → gain → speakers
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    // Configure pure sine wave
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    
    // Set volume envelope (fade in/out for smooth sound)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.05);  // Quick fade in
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // Fade out
    
    // Start and schedule stop
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    
    // Store for cleanup
    activeNodesRef.current.push(oscillator);
  };

  /**
   * Play sound for exactly 3 seconds as per research specs (Ward et al., 2006)
   * 
   * Behavior:
   * - If already playing: stops sound immediately
   * - If not playing: plays sound for 3 seconds
   * - For 'sine': generates pure sine waves via Web Audio API
   * - For other instruments: plays sampled sounds via Soundfont
   * - Supports dyads (simultaneous notes) by playing all notes at same time
   * - Automatically stops after 3 seconds
   * 
   * Audio Settings:
   * - Duration: 3 seconds (research specification)
   * - Gain: 0.4 (40% volume for comfortable listening)
   * - Notes played simultaneously for dyads
   */
  const playSound = async () => {
    if (!instrumentRef.current || isLoading) return;
    
    // If already playing, stop the sound (toggle behavior)
    if (isPlaying) {
      stopSound();
      return;
    }
    
    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const { notes } = parseStimulus(stimulus);
      setIsPlaying(true);
      
      console.log('Playing audio:', stimulus, '→', notes);
      
      const duration = 3; // 3 seconds per research spec
      const now = audioContextRef.current.currentTime;
      
      // Check if using pure sine waves
      if (instrumentRef.current === 'sine') {
        // Generate pure sine waves using Web Audio API
        notes.forEach(note => {
          playSineWave(note, now, duration);
        });
      } else {
        // Play sampled instrument sounds
        notes.forEach(note => {
          const audioNode = instrumentRef.current.play(
            note, 
            now, 
            {
              duration: duration,
              gain: 0.4  // 40% volume for comfortable listening
            }
          );
          activeNodesRef.current.push(audioNode);
        });
      }
      
      // Automatically stop after 3 seconds
      timeoutIdRef.current = setTimeout(() => {
        stopSound();
        timeoutIdRef.current = null;
      }, 3000);
      
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
    }
  };

  /**
   * Format display name for stimulus
   * 
   * Examples:
   * - Single note: "C4 piano"
   * - Dyad: "C1 + G1 piano"
   * - Pure tone: "C4 sine"
   */
  const getDisplayName = () => {
    const { notes, instrumentName } = parseStimulus(stimulus);
    const isDyad = notes.length > 1;
    
    if (isDyad) {
      return `${notes.join(' + ')} ${instrumentName}`;
    }
    return `${notes[0]} ${instrumentName}`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.5rem',
      marginTop: '1rem'
    }}>
      {/* Play/Stop button - circular design with play/stop icons */}
      <button
        onClick={playSound}
        disabled={isLoading}
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: '4px solid #2563eb',
          background: isPlaying ? '#dbeafe' : '#fff',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: isPlaying 
            ? '0 8px 16px rgba(37, 99, 235, 0.3)' 
            : '0 4px 6px rgba(0, 0, 0, 0.1)',
          opacity: isLoading ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = isPlaying ? '#dbeafe' : '#f0f9ff';
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.background = isPlaying ? '#dbeafe' : '#fff';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
        aria-label={isPlaying ? "Stop sound" : "Play sound"}
      >
        {isPlaying ? (
          // Stop icon (square)
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#2563eb">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        ) : (
          // Play icon (triangle)
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#2563eb">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      
      {/* Instrument and note name display */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: '1.25rem',
          color: '#111827',
          fontWeight: '700',
          marginBottom: '0.5rem'
        }}>
          {getDisplayName()}
        </p>

        {/* Status message */}
        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          {isLoading 
            ? 'Loading instrument...' 
            : isPlaying 
              ? 'Playing... (click to stop)'
              : 'Click play to hear the sound (3s)'}
        </p>
      </div>
    </div>
  );
}