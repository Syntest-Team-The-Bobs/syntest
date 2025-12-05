import React from "react";
import { useNavigate } from "react-router-dom";
import TestIntro from "./TestIntro";
import TestComplete from "./TestComplete";
import TestLayout from "./TestLayout";
import { useColorTest } from "../../hooks/useColorTest";
import { useColorTestAPI } from "../../hooks/useColorTestAPI";
import { useMusicPlayer } from "../../hooks/useMusicPlayer";

/**
 * BaseColorTest - Main orchestrator for color synesthesia tests
 * 
 * Responsibilities:
 * - Coordinates test flow (intro → test → complete)
 * - Handles test submission via useColorTestAPI hook
 * - Manages navigation between test phases
 * - Delegates state management to useColorTest hook
 * - Delegates UI rendering to presentational components
 * - Delegates audio playback to useMusicPlayer hook
 */
export default function BaseColorTest({ testType, stimuli, practiceStimuli, title, introConfig }) {
  const navigate = useNavigate();
  
  // Get API submission function
  const { submitBatch, isSubmitting, error } = useColorTestAPI();
  
  /**
   * Submits test results to backend when test is complete
   * Called by useColorTest hook when final trial is submitted
   */
  async function handleTestComplete(finalResponses) {
    try {
      await submitBatch(finalResponses, testType);
      console.log('✅ Test results saved successfully!');
    } catch (e) {
      console.error("❌ Error submitting results:", e);
    }
  }

  // Delegate state management to custom hook
  const {
    phase,
    selected,
    locked,
    noExperience,
    deck,
    idx,
    current,
    onPick,
    toggleLock,
    toggleNoExperience,
    startTest,
    handleNext
  } = useColorTest(stimuli, practiceStimuli, handleTestComplete);

  // Delegate music playback to dedicated hook
  const { handleReplay } = useMusicPlayer(testType, current, phase);

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
      noExperience={noExperience}
      progressValue={idx / total}
      onPick={onPick}
      onToggleLock={toggleLock}
      onToggleNoExperience={toggleNoExperience}
      onNext={handleNext}
      onReplay={testType === 'music' ? handleReplay : undefined}
      getFontSize={getFontSize}
    />
  );
}
