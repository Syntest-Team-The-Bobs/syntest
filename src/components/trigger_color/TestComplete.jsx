import React from 'react';

/**
 * TestComplete - Completion screen displayed after test finishes
 * 
 * Responsibilities:
 * - Shows success message and completion state
 * - Provides navigation to next test phase
 * - Visual feedback (green text for final completion)
 */
export default function TestComplete({ onNext, isDone = false }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", padding: "4rem 2rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ 
          fontSize: "2.5rem", 
          fontWeight: "bold", 
          marginBottom: "2rem", 
          color: isDone ? "#16a34a" : "#111827"  // Green for success, gray otherwise
        }}>
          Test Complete!
        </h1>
        <p style={{ fontSize: "1.25rem", marginBottom: "3rem", color: "#4b5563" }}>
          Good job, you completed your test. Please proceed to the Speed Congruency Test.
        </p>
        <button 
          onClick={onNext}
          style={{ 
            background: "#2563eb", 
            color: "white", 
            padding: "0.875rem 2.5rem", 
            border: "none", 
            fontSize: "1rem", 
            fontWeight: "600", 
            cursor: "pointer", 
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)", 
            borderRadius: "4px" 
          }}
        >
          Proceed to Speed Congruency Test
        </button>
      </div>
    </div>
  );
}