// src/pages/trigger_color/SpeedCongruencyTest.jsx

import React, { useEffect, useRef, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { speedCongruencyService } from '../../services/speedCongruency';

export default function SpeedCongruencyTest() {
  // ---- Core state ----
  const [phase, setPhase] = useState('intro'); 
  // 'intro' | 'stimulus' | 'choices' | 'done' | 'error'

  const [hasStarted, setHasStarted] = useState(false);

  const [trialIndex, setTrialIndex] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(null);
  const [totalTrials, setTotalTrials] = useState(1);

  const [countdown, setCountdown] = useState(3);
  const [selectedOptionId, setSelectedOptionId] = useState(null);

  const [isLoadingTrial, setIsLoadingTrial] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // For reaction time (choices phase)
  const choiceStartRef = useRef(null);

  // =====================================
  // Load trial whenever trialIndex changes
  // =====================================
  useEffect(() => {
    async function loadTrial() {
      setIsLoadingTrial(true);
      setErrorMessage('');
      setSelectedOptionId(null);

      try {
        // If your backend expects ?trialIndex=, add params here.
        const data = await speedCongruencyService.getNextTrial(trialIndex);

        // Expected shape (or similar):
        // {
        //   id,
        //   trigger,
        //   options: [ { id, label, color }, ... ],
        //   trialIndex,
        //   totalTrials,
        //   ...
        // }

        if (data.done || data.totalTrials === 0) {
          setCurrentTrial(null);
          setPhase('done');
          return;
        }

        setCurrentTrial(data);
        setTotalTrials(data.totalTrials || 1);
        setCountdown(3);

        // BEFORE starting, stay in 'intro' until user clicks Begin.
        // AFTER the user has started once, new trials go straight to 'stimulus'.
        setPhase(prev =>
          hasStarted ? 'stimulus' : 'intro'
        );
      } catch (e) {
        console.error('Error loading speed congruency trial:', e);
        setErrorMessage('Unable to load the test right now. Please try again.');
        setPhase('error');
      } finally {
        setIsLoadingTrial(false);
      }
    }

    loadTrial();
    // include hasStarted so phase logic stays correct when loading
  }, [trialIndex, hasStarted]);

  // =====================================
  // Countdown effect in "stimulus" phase
  // =====================================
  useEffect(() => {
    if (phase !== 'stimulus' || !currentTrial) return;

    setCountdown(3);
    const timerId = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          setPhase('choices');
          choiceStartRef.current = performance.now();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [phase, currentTrial]);

  // =====================================
  // Handlers
  // =====================================

  const handleBeginClick = () => {
    // Only allow start if we actually have a trial loaded
    if (!currentTrial) return;
    setHasStarted(true);
    setPhase('stimulus');
  };

  const handleOptionClick = optionId => {
    if (isSubmitting) return;
    setSelectedOptionId(optionId);
  };

  const handleNextTrial = async () => {
    if (!currentTrial || !selectedOptionId) return;

    const reactionTimeMs = choiceStartRef.current
      ? performance.now() - choiceStartRef.current
      : null;

    setIsSubmitting(true);
    try {
      // Find the full option so we can send more details if needed
      const chosenOption =
        currentTrial.options.find(o => o.id === selectedOptionId) || {};

      await speedCongruencyService.submitTrial({
        trialId: currentTrial.id,
        trigger: currentTrial.trigger,
        selectedOptionId,
        selectedColor: {
          r: chosenOption.r,
          g: chosenOption.g,
          b: chosenOption.b,
          hex: chosenOption.color,
        },
        reactionTimeMs,
        trialIndex,
        stimulusId: currentTrial.stimulusId,
        testDataId: currentTrial.testDataId,
        // optional: pass expectedColor if backend wants it
        expectedColor: currentTrial.expectedColor,
      });
    } catch (e) {
      console.error('Error submitting speed congruency trial:', e);
      // You may want to surface a message, but still allow flow:
      // setErrorMessage('There was a problem saving your answer.');
    } finally {
      setIsSubmitting(false);
    }

    // Move to next trial or finish
    const nextIndex = trialIndex + 1;
    if (nextIndex < totalTrials) {
      setTrialIndex(nextIndex);
      setPhase('stimulus');
      setSelectedOptionId(null);
      choiceStartRef.current = null;
    } else {
      setPhase('done');
    }
  };

  // =====================================
  // Shared layout styles
  // =====================================

  const pageStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 120px)', // account for header/footer
  };

  const cardStyle = {
    maxWidth: '720px',
    width: '100%',
    padding: '32px',
    textAlign: 'center',
  };

  const triggerBoxStyle = {
    border: '2px solid #ccc',
    borderRadius: '8px',
    padding: '40px 24px',
    fontSize: '1.5rem',
    margin: '0 auto 32px',
    maxWidth: '320px',
  };

  const timerCircleStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#222',
    color: '#fff',
    fontSize: '1.25rem',
  };

  const optionsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '32px',
    justifyItems: 'center',
    marginTop: '24px',
    marginBottom: '24px',
  };

  const optionBoxBaseStyle = {
    width: '140px',
    height: '140px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    cursor: 'pointer',
    border: '3px solid transparent',
    color: '#000',
  };

  // =====================================
  // Render: loading / error / done
  // =====================================

  if (isLoadingTrial && !currentTrial && phase !== 'intro') {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle} title="Speed Congruency Test">
          <p>Loading test…</p>
        </Card>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle} title="Speed Congruency Test">
          <p>{errorMessage || 'Something went wrong loading the test.'}</p>
        </Card>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle} title="Speed Congruency Test">
          <p>Thank you for completing the Speed Congruency Test.</p>
        </Card>
      </div>
    );
  }

  // If we’re still loading and in intro phase, show a gentle loading state
  if (!currentTrial && (phase === 'intro' || isLoadingTrial)) {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle} title="Speed Congruency Test">
          <p>Preparing your personalized test…</p>
        </Card>
      </div>
    );
  }

  // =====================================
  // Render: INTRO (instructions)
  // =====================================

  if (phase === 'intro') {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle} title="Speed Congruency Test">
          <p style={{ marginBottom: '12px', lineHeight: 1.5 }}>
            In this test, you will see one of your personal triggers on the
            screen (for example, a word, letter, or number). As quickly and
            accurately as possible, choose the colour that you naturally
            associate with that trigger.
          </p>

          <p style={{ marginBottom: '12px', lineHeight: 1.5 }}>
            Your reaction time and accuracy will be recorded for research
            purposes. Please sit comfortably, minimize distractions, and respond
            with your first, instinctive colour choice.
          </p>

          <p style={{ marginBottom: '16px', lineHeight: 1.5 }}>
            When you click <strong>Begin Test</strong>, you’ll see a trigger
            appear alone for a few seconds. After that, four coloured boxes will
            be shown — click the one that best matches your association.
          </p>

          <Button
            onClick={handleBeginClick}
            style={{ width: '100%', marginTop: '16px' }}
          >
            Begin Test
          </Button>

          <p
            style={{
              marginTop: '12px',
              fontSize: '0.85rem',
              color: '#777',
            }}
          >
            You can stop at any time.
          </p>
        </Card>
      </div>
    );
  }

  // =====================================
  // Render: STIMULUS phase (3–2–1 + trigger)
  // =====================================

  if (phase === 'stimulus') {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle}>
          <div style={triggerBoxStyle}>{currentTrial.trigger}</div>
          <div style={timerCircleStyle}>{countdown}</div>
          <p style={{ marginTop: '16px', color: '#777' }}>
            Get ready to choose the matching colour…
          </p>
          <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#999' }}>
            Trial {trialIndex + 1} of {totalTrials}
          </p>
        </Card>
      </div>
    );
  }

  // =====================================
  // Render: CHOICES phase
  // =====================================

  return (
    <div style={pageStyle}>
      <Card style={cardStyle}>
        <h2>Pick the correct association</h2>
        <p>
          Choose the colour that best matches your automatic association with
          the trigger.
        </p>

        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
          <strong>{currentTrial.trigger}</strong>
        </div>

        <div style={optionsGridStyle}>
          {currentTrial.options.map(option => {
            const isSelected = option.id === selectedOptionId;
            const optionStyle = {
              ...optionBoxBaseStyle,
              backgroundColor: option.color,
              borderColor: isSelected ? '#000' : 'transparent',
              boxShadow: isSelected
                ? '0 0 0 2px rgba(0, 0, 0, 0.4)'
                : '0 0 0 0 rgba(0, 0, 0, 0)',
            };

            return (
              <div
                key={option.id}
                style={optionStyle}
                onClick={() => handleOptionClick(option.id)}
              >
                {option.label}
              </div>
            );
          })}
        </div>

        {selectedOptionId && (
          <Button onClick={handleNextTrial} disabled={isSubmitting}>
            {trialIndex + 1 === totalTrials ? 'Finish' : 'Next'}
          </Button>
        )}

        <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#777' }}>
          Trial {trialIndex + 1} of {totalTrials}
        </p>
      </Card>
    </div>
  );
}
