import React from "react";
import { useNavigate } from "react-router-dom";
import TestIntro from "./TestIntro";
import TestComplete from "./TestComplete";
import TestLayout from "./TestLayout";
import { useColorTest } from "../../hooks/useColorTest";
import { colorService } from "../../services/color";

/**
 * BaseColorTest - Main orchestrator for color synesthesia tests
 * 
 * Responsibilities:
 * - Coordinates test flow (intro → test → complete)
 * - Handles test submission via colorService
 * - Manages navigation between test phases
 * - Delegates state management to useColorTest hook
 * - Delegates UI rendering to presentational components
 */
export default function BaseColorTest({ testType, stimuli, practiceStimuli, title, introConfig }) {
  const navigate = useNavigate();
  
  /**
   * Submits test results to backend when test is complete
   * Called by useColorTest hook when final trial is submitted
   */
  async function handleTestComplete(finalResponses) {
    try {
      await colorService.submitColorTest({
        testType: `color-${testType}`,
        participantId: null,
        trials: finalResponses,
        completedAt: new Date().toISOString(),
        metadata: colorService.calculateMetadata(finalResponses),
      });
    } catch (e) {
      console.error("Error submitting results:", e);
    }
  }

  // Delegate state management to custom hook
  const {
    phase,
    selected,
    locked,
    deck,
    idx,
    current,
    onPick,
    toggleLock,
    startTest,
    handleNext
  } = useColorTest(stimuli, practiceStimuli, handleTestComplete);

  /**
   * Calculates responsive font size based on stimulus type and length
   * Words scale down for longer text, letters/numbers stay large
   */
  const getFontSize = () => {
    if (!current) return "7rem";
    const length = current.stimulus.length;
    if (testType === 'word') {
      if (length <= 3) return "5rem";
      if (length <= 5) return "4rem";
      if (length <= 7) return "3rem";
      return "2.5rem";
    }
    return "7rem";
  };

  // Render intro screen
  if (phase === "intro") {
    return <TestIntro introConfig={introConfig} onStart={startTest} />;
  }

  // Render completion screen with navigation to next test
  if (phase === "done") {
    return (
      <TestComplete 
        isDone={true}
        onNext={() => navigate("/speed-congruency/instructions")} 
      />
    );
  }

  // Safety check: don't render if no current stimulus
  if (!current) return null;

  // Calculate progress metrics for UI display
  const total = deck.length;
  const itemsPerTrial = stimuli.length;
  const currentTrialNum = Math.floor(idx / itemsPerTrial) + 1;
  const progressInTrial = (idx % itemsPerTrial) + 1;

  // Render main test interface
  return (
    <TestLayout
      title={title}
      testType={testType}
      phase={phase}
      current={current}
      stimulus={current.stimulus}
      currentTrial={currentTrialNum}
      progressInTrial={progressInTrial}
      itemsPerTrial={itemsPerTrial}
      locked={locked}
      selected={selected}
      progressValue={idx / total}
      onPick={onPick}
      onToggleLock={toggleLock}
      onNext={handleNext}
      getFontSize={getFontSize}
    />
  );
}