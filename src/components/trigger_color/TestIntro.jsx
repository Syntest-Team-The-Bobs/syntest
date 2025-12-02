import React from 'react';

/**
 * TestIntro - Introduction/welcome screen for color synesthesia test
 * 
 * Responsibilities:
 * - Displays test title, description, and instructions
 * - Shows estimated completion time
 * - Provides start button to begin test
 * 
 */
export default function TestIntro({ introConfig, onStart }) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "4rem 2rem", textAlign: "center" }}>
        {/* Test title */}
        <h2 style={{ 
          fontSize: "2.5rem", 
          fontWeight: "bold", 
          marginBottom: "2rem", 
          color: "#111827" 
        }}>
          {introConfig.title}
        </h2>

        {/* Test description */}
        <p style={{ 
          fontSize: "1.125rem", 
          marginBottom: "2rem", 
          lineHeight: "1.7", 
          color: "#4b5563" 
        }}>
          {introConfig.description}
        </p>

        {/* Instruction list */}
        <ul style={{ 
          textAlign: "left", 
          maxWidth: "600px", 
          margin: "0 auto 2rem", 
          lineHeight: "1.9", 
          fontSize: "1rem", 
          color: "#374151" 
        }}>
          {introConfig.instructions.map((txt, i) => (
            <li key={i} style={{ marginBottom: "0.5rem" }}>{txt}</li>
          ))}
        </ul>

        {/* Time estimate */}
        <p style={{ marginBottom: "3rem", color: "#6b7280", fontSize: "1rem" }}>
          ⏱️ Estimated time: {introConfig.estimatedTime}
        </p>

        {/* Start button */}
        <button 
          onClick={onStart} 
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
          Start Test
        </button>
      </div>
    </div>
  );
}