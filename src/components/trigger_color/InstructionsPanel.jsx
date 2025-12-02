import React from "react";

/**
 * InstructionsPanel - Displays step-by-step test instructions
 * 
 * Responsibilities:
 * - Shows numbered instructions for completing the color test
 * - Provides context-specific guidance based on test type
 * - Pure presentational component with consistent styling
 * 
 * Props:
 * @param {string} testType - Type of test ('word', 'letter', 'number') for contextual labels
 * 
 * SOLID Compliance:
 * - SRP: Only renders static instructions
 * - OCP: Adaptable via testType prop
 * - ISP: Single-prop interface
 */
export default function InstructionsPanel({ testType }) {
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
        lineHeight: 1.7, 
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
          <span style={{ color: "#dc2626", fontWeight: "bold" }}>red</span>.
        </li>
        <li>
          Press <strong>Next</strong> to save.
        </li>
      </ol>
    </div>
  );
}