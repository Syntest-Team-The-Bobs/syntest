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
