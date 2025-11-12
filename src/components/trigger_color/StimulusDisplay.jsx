import React from 'react';

/**
 * StimulusDisplay - Shows the current stimulus (letter/number/word) to be color-matched
 * 
 * Responsibilities:
 * - Displays the current test stimulus with responsive font sizing
 * - Shows contextual helper text based on test type
 * - Adjusts text size dynamically via getFontSize function
 */
export default function StimulusDisplay({ stimulus, testType, getFontSize }) {
  return (
    <div style={{ 
      textAlign: "left", 
      minHeight: "120px", 
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "center", 
      width: "100%" 
    }}>
      {/* Main stimulus text with dynamic font sizing */}
      <h2 style={{ 
        fontSize: getFontSize(), 
        fontWeight: "bold", 
        marginBottom: "0.5rem", 
        color: "#111827", 
        lineHeight: "1.1",
        wordBreak: "break-word",
        maxWidth: "260px"
      }}>
        {stimulus}
      </h2>

      {/* Contextual helper text */}
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.4" }}>
        This is the current {testType} to<br />color-match.
      </p>
    </div>
  );
}