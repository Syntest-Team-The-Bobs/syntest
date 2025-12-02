import React from 'react';

/**
 * TestProgress - Displays current progress information during test
 * 
 * Responsibilities:
 * - Shows current stimulus being tested
 * - Displays trial number (1-3 for each stimulus)
 * - Shows progress through current trial set
 */
export default function TestProgress({ 
  stimulus, 
  currentTrial, 
  totalTrials, 
  currentItem, 
  totalItems 
}) {
  return (
    <div style={{ 
      fontSize: "0.875rem", 
      color: "#6b7280", 
      display: "flex", 
      gap: "1.5rem" 
    }}>
      <span>Item: <strong>{stimulus}</strong></span>
      <span>Trial <strong>{currentTrial}</strong> / <strong>{totalTrials}</strong></span>
      <span>Progress <strong>{currentItem}/{totalItems}</strong></span>
    </div>
  );
}