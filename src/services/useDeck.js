import { useRef, useState } from "react";

/**
 * useDeck - Lightweight hook for managing deck progression and timing
 * 
 * Responsibilities:
 * - Tracks current position in stimulus deck
 * - Measures reaction time for each trial
 * - Provides navigation functions (next)
 */
export function useDeck(deck) {
  const [idx, setIdx] = useState(0);
  const startRef = useRef(0);
  
  // Start reaction timer
  const start = () => { 
    startRef.current = performance.now(); 
  };
  
  // Calculate elapsed time since start
  const reactionMs = () => performance.now() - startRef.current;
  
  // Advance to next item
  const next = () => setIdx((i) => i + 1);

  return { deck, idx, setIdx, start, reactionMs, next };
}

/**
 * buildDeck - Constructs randomized trial deck with repetitions
 * 
 * Creates a deck where each stimulus appears multiple times (repeats)
 * in randomized order. Each repetition is shuffled independently.
 */
export function buildDeck(items, repeats = 3) {
  /**
   * Fisher-Yates shuffle algorithm
   * Randomly reorders array elements in-place
   */
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const trials = [];
  
  // Build deck with specified repetitions
  for (let trial = 1; trial <= repeats; trial++) {
    shuffle([...items]).forEach((item, idx) => {
      trials.push({ 
        stimulus: String(item),  // Ensure string format
        trial,                   // Repetition number (1-3)
        itemId: idx + 1          // Position in shuffled set
      });
    });
  }
  
  return trials;
}

/**
 * Letter Test Configuration
 * Complete English alphabet (26 letters)
 */
const LETTER_STIMULI = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

/**
 * buildLetterDecks - Factory for letter test configuration
 */
export function buildLetterDecks() {
  return {
    stimuli: LETTER_STIMULI,
    practiceStimuli: LETTER_STIMULI  // Same as main (no separate practice)
  };
}

/**
 * Number Test Configuration
 * All single digits (10 numbers)
 */
const NUMBER_STIMULI = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * buildNumberDecks - Factory for number test configuration
 */
export function buildNumberDecks() {
  return {
    stimuli: NUMBER_STIMULI,
    practiceStimuli: NUMBER_STIMULI  // Same as main (no separate practice)
  };
}

/**
 * Word Test Configuration
 * Curated list of 15 common words across various categories
 * (colors, nature, time, animals, food, days, abstract concepts)
 */
const WORD_STIMULI = [
  "RED", "BLUE", "GREEN",
  "SUN", "MOON", "STAR",
  "DAY", "NIGHT",
  "CAT", "DOG", "APPLE",
  "MONDAY", "MUSIC", "WATER", "SALT"
];

/**
 * buildWordDecks - Factory for word test configuration
 */
export function buildWordDecks() {
  return {
    stimuli: WORD_STIMULI,
    practiceStimuli: WORD_STIMULI  // Same as main (no separate practice)
  };
}

/**
 * Music Test Configuration
 * Based on Ward et al., 2006 specifications for music-color synesthesia research
 * 
 * 70 total stimuli as per research requirements:
 * - 40 single notes (30 from piano/sine/strings + 10 at C4 from various instruments)
 * - 30 dyads (simultaneous two-note chords)
 * 
 * Format: 'NOTE-INSTRUMENT' or 'NOTE1+NOTE2-INSTRUMENT'
 * Examples: 'C4-piano', 'C1+G1-string'
 * 
 * Notes follow standard pitch notation (C1-C7)
 * Instruments: piano, sine, string, flute, clarinet, trumpet, violin, cello, 
 *              guitar, organ, saxophone, oboe, bassoon
 */
const MUSIC_STIMULI = [
  // ===== SINGLE NOTES (40 total) =====

  // Piano notes (10): C1, G1, D2, A2, E3, B3, F#4, Db5, Ab5, Eb6
  'C1-piano', 'G1-piano', 'D2-piano', 'A2-piano', 'E3-piano',
  'B3-piano', 'F#4-piano', 'Db5-piano', 'Ab5-piano', 'Eb6-piano',

  // Pure sine wave notes (10): Same pitches as piano
  'C1-sine', 'G1-sine', 'D2-sine', 'A2-sine', 'E3-sine',
  'B3-sine', 'F#4-sine', 'Db5-sine', 'Ab5-sine', 'Eb6-sine',

  // String notes (10): Same pitches as piano
  'C1-string', 'G1-string', 'D2-string', 'A2-string', 'E3-string',
  'B3-string', 'F#4-string', 'Db5-string', 'Ab5-string', 'Eb6-string',

  // C4 frequency (262 Hz) from different instruments (10)
  'C4-flute', 'C4-clarinet', 'C4-trumpet', 'C4-violin', 'C4-cello',
  'C4-guitar', 'C4-organ', 'C4-saxophone', 'C4-oboe', 'C4-bassoon',

  // ===== DYADS (30 total) =====

  // Piano dyads (10) - Perfect fifth intervals (changed last dyad from Eb6+Bb6 to Ab5+Eb6)
  'C1+G1-piano', 'G1+D2-piano', 'D2+A2-piano', 'A2+E3-piano', 'E3+B3-piano',
  'B3+F#4-piano', 'F#4+Db5-piano', 'Db5+Ab5-piano', 'Ab5+Eb6-piano', 'Ab5+Eb6-piano',

  // Pure sine dyads (10) - Same intervals as piano (changed last dyad from Eb6+Bb6 to Ab5+Eb6)
  'C1+G1-sine', 'G1+D2-sine', 'D2+A2-sine', 'A2+E3-sine', 'E3+B3-sine',
  'B3+F#4-sine', 'F#4+Db5-sine', 'Db5+Ab5-sine', 'Ab5+Eb6-sine', 'Ab5+Eb6-sine',

  // String dyads (10) - Same intervals as piano (changed last dyad from Eb6+Bb6 to Ab5+Eb6)
  'C1+G1-string', 'G1+D2-string', 'D2+A2-string', 'A2+E3-string', 'E3+B3-string',
  'B3+F#4-string', 'F#4+Db5-string', 'Db5+Ab5-string', 'Ab5+Eb6-string', 'Ab5+Eb6-string'
];

/**
 * buildMusicDecks - Factory for music test configuration
 * 
 * Returns 70 musical stimuli as per research specifications (Ward et al., 2006)
 * Practice uses single piano note for familiarity
 */
export function buildMusicDecks() {
  return {
    stimuli: MUSIC_STIMULI,
    practiceStimuli: ['C4-piano']  // Single practice note
  };
}