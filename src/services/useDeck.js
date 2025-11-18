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