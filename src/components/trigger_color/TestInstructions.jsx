import React from 'react';

/**
 * TestInstructions - Step-by-step instructions panel for color test
 * 
 * Responsibilities:
 * - Displays numbered list of test instructions
 * - Provides clear, concise guidance for test completion
 * - Consistent formatting with visual emphasis on key actions
 */
export default function TestInstructions({ testType }) {
  return (
    <div>
      <h3 style={{ 
        fontWeight: "bold", 
        fontSize: "0.8125rem", 
        marginBottom: "1rem", 
        color: "#111827", 
        letterSpacing: "0.025em" 
      }}>
        HOW TO COMPLETE THE TEST
      </h3>
      <ol style={{ 
        fontSize: "0.8125rem", 
        lineHeight: "1.7", 
        paddingLeft: "1.25rem", 
        color: "#374151", 
        margin: 0 
      }}>
        <li style={{ marginBottom: "0.75rem" }}>
          Read the {testType} on the right.
        </li>
        <li style={{ marginBottom: "0.75rem" }}>
          <strong>Click and hold</strong> on the wheel, then <strong>drag</strong> to preview and adjust.
        </li>
        <li style={{ marginBottom: "0.75rem" }}>
          Release or single-click to <strong>lock</strong> the color — the small circle turns{' '}
          <span style={{ color: "#dc2626", fontWeight: "bold" }}>red</span> when locked. Click again to unlock.
        </li>
        <li>
          Press <strong>Next</strong> to save.
        </li>
      </ol>
    </div>
  );
}