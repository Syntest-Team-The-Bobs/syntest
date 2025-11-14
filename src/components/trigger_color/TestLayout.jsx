import React, { useState } from 'react';
import TestProgress from './TestProgress';
import TestInstructions from './TestInstructions';
import ColorWheel from './ColorWheel';
import StimulusDisplay from './StimulusDisplay';
import ColorPreviewLock from './ColorPreviewLock';
import ProgressBar from '../ui/ProgressBar';
import MusicPlayer from './MusicPlayer';

/**
 * TestLayout - Main UI layout for color synesthesia test interface
 * 
 * Responsibilities:
 * - Orchestrates layout of all test UI components in a 3-column grid
 * - Displays title, instructions, and progress information
 * - Manages visual hierarchy and spacing of test elements
 * - Conditionally renders MusicPlayer for music tests or StimulusDisplay for other tests
 * - Disables Next button during audio playback (music tests only)
 * 
 * Layout Structure:
 * - Header: Title and instructions
 * - Progress: Test phase and trial information
 * - 3-Column Grid:
 *   - Left: Instructions panel
 *   - Center: Color wheel
 *   - Right: Stimulus display (music player or text) + color preview + Next button
 * - Footer: Overall progress bar
 */
export default function TestLayout({
  title,
  testType,
  phase,
  current,
  stimulus,
  currentTrial,
  progressInTrial,
  itemsPerTrial,
  locked,
  selected,
  progressValue,
  onPick,
  onToggleLock,
  onNext,
  getFontSize
}) {
  // Track music playing state to disable Next button during playback
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 2rem" }}>
        
        {/* Page title */}
        <h1 style={{ 
          fontSize: "2.25rem", 
          fontWeight: "bold", 
          textAlign: "center", 
          marginBottom: "1rem", 
          color: "#111827" 
        }}>
          {title}: CONSISTENCY & SPEED
        </h1>

        {/* Instructions summary - different text for music vs other tests */}
        <p style={{ 
          textAlign: "center", 
          maxWidth: "850px", 
          margin: "0 auto 2.5rem", 
          color: "#6b7280", 
          fontSize: "0.9375rem", 
          lineHeight: "1.6" 
        }}>
          {testType === 'music' ? (
            <>
              You'll assign a color to each <strong>musical sound</strong>. <strong>Press the play button</strong> to hear each sound, then <strong>click and hold</strong> the mouse on the wheel and <strong>drag</strong> to preview and adjust a color.
              To record a choice, <strong>click to lock</strong> it — the small circle turns <span style={{ color: "#dc2626", fontWeight: "bold" }}>red</span> when locked — and click again to unlock if you need to change it.
              Press <strong>Next</strong> to save each choice. For best results, use a laptop/desktop with audio enabled.
            </>
          ) : (
            <>
              You'll assign a color to each <strong>{testType}</strong>. <strong>Click and hold</strong> the mouse on the wheel and <strong>drag</strong> to preview and adjust a color.
              To record a choice, <strong>click to lock</strong> it — the small circle turns <span style={{ color: "#dc2626", fontWeight: "bold" }}>red</span> when locked — and click again to unlock if you need to change it.
              Press <strong>Next</strong> to save each choice. For best results, use a laptop/desktop and turn off blue-light filters.
            </>
          )}
        </p>

        {/* Test phase and progress indicators */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ 
            fontSize: "1.25rem", 
            fontWeight: "bold", 
            marginBottom: "0.5rem", 
            color: "#111827" 
          }}>
            {phase === "practice" ? "PRACTICE" : "CONSISTENCY TEST"}
          </h2>
          <TestProgress 
            stimulus={stimulus}
            currentTrial={currentTrial}
            totalTrials={3}
            currentItem={progressInTrial}
            totalItems={itemsPerTrial}
          />
        </div>

        {/* Main 3-column layout */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "280px 1fr 280px", 
          gap: "3rem", 
          alignItems: "start", 
          maxWidth: "1400px" 
        }}>
          
          {/* Left column: Instructions */}
          <TestInstructions testType={testType} />

          {/* Center column: Color picker wheel */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <ColorWheel 
              width={500} 
              height={400} 
              lock={locked} 
              onPick={onPick}
              onToggleLock={onToggleLock}
            />
            <p style={{ 
              fontSize: "0.8125rem", 
              color: "#6b7280", 
              marginTop: "1rem", 
              textAlign: "center", 
              maxWidth: "450px", 
              lineHeight: "1.5" 
            }}>
              Click and hold, then drag to adjust. Click to <strong>lock</strong> (circle turns <span style={{ color: "#dc2626", fontWeight: "bold" }}>red</span>); click again to unlock.
            </p>
          </div>

          {/* Right column: Stimulus, preview, and action button */}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "flex-start", 
            gap: "1.5rem", 
            paddingLeft: "1rem" 
          }}>
            {/* Conditionally render MusicPlayer for music tests, StimulusDisplay for others */}
            {testType === 'music' ? (
              <MusicPlayer 
                stimulus={current.stimulus} 
                onPlayingChange={setIsMusicPlaying}
              />
            ) : (
              <StimulusDisplay 
                stimulus={stimulus}
                testType={testType}
                getFontSize={getFontSize}
              />
            )}

            {/* Color preview box with lock toggle */}
            <ColorPreviewLock 
              selected={selected}
              locked={locked}
              onToggle={onToggleLock}
            />

            {/* Next button - disabled until color is locked AND music is not playing */}
            <button
              onClick={onNext}
              disabled={!locked || isMusicPlaying}
              style={{
                marginTop: "1rem",
                padding: "0.625rem 2rem",
                border: "none",
                borderRadius: "4px",
                cursor: (locked && !isMusicPlaying) ? "pointer" : "not-allowed",
                backgroundColor: (locked && !isMusicPlaying) ? "#000" : "#d1d5db",
                color: "white",
                fontWeight: "600",
                fontSize: "0.875rem",
              }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Bottom: Overall progress bar */}
        <div style={{ marginTop: "3rem", maxWidth: "900px", margin: "3rem auto 0" }}>
          <ProgressBar value={progressValue} />
        </div>
      </div>
    </div>
  );
}