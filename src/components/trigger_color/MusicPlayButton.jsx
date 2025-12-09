import React from 'react';

/**
 * MusicPlayButton - Dedicated component for music test playback control
 * 
 * Responsibilities:
 * - Displays circular play button for music stimuli
 * - Handles replay functionality
 * - Shows contextual helper text for music tests
 * - Displays stimulus label in monospace font
 * 
 * Separated from StimulusDisplay to follow Single Responsibility Principle
 */
export default function MusicPlayButton({ stimulus, onReplay }) {
  return (
    <div style={{ 
      textAlign: "left", 
      minHeight: "120px", 
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "center", 
      width: "100%" 
    }}>
      {/* Play button for music */}
      <div style={{ marginBottom: "0.5rem" }}>
        <button 
          onClick={onReplay}
          aria-label="Play sound"
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            border: "3px solid #000",
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = "white"}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#000">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>
      </div>

      {/* Contextual helper text */}
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", lineHeight: "1.4" }}>
        This is the current sound to<br />color-match.
      </p>
      
      {/* Show stimulus label */}
      <p style={{ 
        fontSize: "0.6875rem", 
        color: "#9ca3af", 
        lineHeight: "1.3",
        fontFamily: "monospace",
        marginTop: "0.25rem"
      }}>
        {stimulus}
      </p>
    </div>
  );
}