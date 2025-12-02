// src/pages/trigger_color/SpeedCongruencyTest.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { speedCongruencyService } from '../../services/speedCongruency';

/**
  * Speed Congruency Test Configuration
  * Defines test content and instructions for speeded color associations
 */
const SPEED_CONFIG = {
  title: 'Speed Congruency Test',
  description:
    'In this test, you will see a trigger (letter/number/word). Choose the color you most strongly associate with it as quickly and accurately as possible.',
  instructions: [
    'You will see a trigger briefly, then four color choices.',
    'Click the color that matches your automatic association.',
    'We record reaction time and accuracy.',
    'Try to respond quickly, but don’t guess wildly.',
  ],
  estimatedTime: '2-4 minutes',
};

/**
 * Dummy / standalone trials
 * This is what your teammate meant by “a simple JSON declared as a const”.
 * Each trial has a trigger + 4 options, and one expectedOptionId.
 */
const DUMMY_TRIALS = [
  {
    id: 't1',
    trigger: 'A',
    expectedOptionId: 'o1',
    options: [
      { id: 'o1', label: 'A', color: '#FF3B30' },
      { id: 'o2', label: 'A', color: '#34C759' },
      { id: 'o3', label: 'A', color: '#007AFF' },
      { id: 'o4', label: 'A', color: '#AF52DE' },
    ],
  },
  {
    id: 't2',
    trigger: '7',
    expectedOptionId: 'o3',
    options: [
      { id: 'o1', label: '7', color: '#FF9500' },
      { id: 'o2', label: '7', color: '#FFCC00' },
      { id: 'o3', label: '7', color: '#0A84FF' },
      { id: 'o4', label: '7', color: '#30D158' },
    ],
  },
  {
    id: 't3',
    trigger: 'MONDAY',
    expectedOptionId: 'o2',
    options: [
      { id: 'o1', label: 'MONDAY', color: '#8E8E93' },
      { id: 'o2', label: 'MONDAY', color: '#FF2D55' },
      { id: 'o3', label: 'MONDAY', color: '#64D2FF' },
      { id: 'o4', label: 'MONDAY', color: '#BF5AF2' },
    ],
  },
];

/** Small helpers */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build decks (consistent with your buildLetterDecks/buildWordDecks pattern)
 * You can later replace DUMMY_TRIALS with personalized trials from DB *if available*,
 * but this version always works standalone.
 */
function buildSpeedCongruencyDecks() {
  // To avoid redundancy between practice and main trials we pick a small
  // practice set and remove those items from the main stimuli. This means
  // users see distinct practice examples rather than repeating the same
  // trial in practice and immediately again in the main test. If you prefer
  // the other behavior (same items for practice + main), change this to two
  // independent shuffles or use the commented alternate below.
  const shuffled = shuffle(DUMMY_TRIALS);
  const practiceStimuli = shuffled.slice(0, 1);
  const stimuli = shuffled.slice(1); // remaining items for the main test

  // Alternate (keep practice items in main as well):
  // const practiceStimuli = shuffle(DUMMY_TRIALS).slice(0,1);
  // const stimuli = shuffle(DUMMY_TRIALS);

  return { stimuli, practiceStimuli };
}

/**
 * SpeedCongruencyTestFlow (internal)
 * This implements the test flow for the speed congruency task. It mirrors
 * the idea of a shared base component (e.g. `BaseColorTest`) but is kept
 * inline in this file for now. Consider extracting to
 * `src/components/trigger_color/SpeedCongruencyTestFlow.jsx` if it grows or
 * is reused elsewhere.
 */
function SpeedCongruencyTestFlow({
  stimuli,
  practiceStimuli,
  title,
  introConfig,
  countdownSeconds = 3,
}) {
  const [phase, setPhase] = useState('intro'); // intro | stimulus | choices | done
  const [mode, setMode] = useState('practice'); // practice | main
  const [trialIndex, setTrialIndex] = useState(0);

  const [countdown, setCountdown] = useState(countdownSeconds);
  const [selectedOptionId, setSelectedOptionId] = useState(null);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const choiceStartRef = useRef(null);

  const deck = mode === 'practice' ? practiceStimuli : stimuli;
  const totalTrials = deck.length;
  const currentTrial = deck[trialIndex] || null;

  // Start countdown when entering stimulus phase
  useEffect(() => {
    if (phase !== 'stimulus' || !currentTrial) return;

    setCountdown(countdownSeconds);
    const timerId = setInterval(() => {
      setCountdown((prev) => {
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
  }, [phase, currentTrial, countdownSeconds]);

  const resetForTrial = () => {
    setSelectedOptionId(null);
    setErrorMessage('');
    // Ensure submission state is cleared between trials so the UI doesn't
    // remain disabled if a previous submission failed or was interrupted.
    setIsSubmitting(false);
    choiceStartRef.current = null;
  };

  const begin = () => {
    if (!currentTrial) return;
    resetForTrial();
    setPhase('stimulus');
  };

  const advance = () => {
    const nextIndex = trialIndex + 1;
    if (nextIndex < totalTrials) {
      setTrialIndex(nextIndex);
      resetForTrial();
      setPhase('stimulus');
      return;
    }

    // If we finish practice, move to main (if any)
    if (mode === 'practice' && stimuli.length > 0) {
      setMode('main');
      setTrialIndex(0);
      resetForTrial();
      setPhase('intro');
      return;
    }

    setPhase('done');
  };

  const submitAndNext = async () => {
    if (!currentTrial || !selectedOptionId) return;

    const reactionTimeMs = choiceStartRef.current
      ? performance.now() - choiceStartRef.current
      : null;

    const isCorrect = selectedOptionId === currentTrial.expectedOptionId;

    const payload = {
      testType: 'speedCongruency',
      mode, // practice or main
      trialId: currentTrial.id,
      trigger: currentTrial.trigger,
      selectedOptionId,
      expectedOptionId: currentTrial.expectedOptionId,
      isCorrect,
      reactionTimeMs,
      trialIndex,
      totalTrials,
      submittedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    setErrorMessage('');
      const STORAGE_KEY = 'speedCongruency_results';

    try {
      // Attempt to submit to the backend. Don't branch on the method's
      // existence — it is expected to be present in `speedCongruencyService`.
      // Any failure (network, server, or missing implementation) will be
      // handled by the surrounding try/catch which persists the entry
      // locally with `status: 'pending'`.
      await speedCongruencyService.submitTrial(payload);
      advance();
    } catch (e) {
      console.error('Error submitting speed congruency trial:', e);
      // Save locally so nothing is lost, then let the user continue
      try {
          // On error, save the entry to the same unified storage key and mark
          // it as pending for later retry. We keep the original payload but add
          // a `status` flag so consumers know this was not delivered.
          const toStore = { ...payload, status: 'pending' };
          const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          existing.push(toStore);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      } catch (err) {
        // Log localStorage failures so they can be diagnosed during development
        // while still allowing the user to continue the test.
        console.error('Failed to save to localStorage:', err);
      }

      setErrorMessage(
        'Could not save to the server. Your response was saved locally and you can continue.'
      );
      advance();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Styles (keep your current inline style vibe) ----
  const pageStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 120px)',
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
    userSelect: 'none',
  };

  // ---- Render ----
  if (phase === 'done') {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle} title={title}>
          <p>Thank you for completing the {title}.</p>
        </Card>
      </div>
    );
  }

  if (!currentTrial) {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle} title={title}>
          <p>No trials are available for this test.</p>
        </Card>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle} title={title}>
          <p style={{ marginBottom: '10px' }}>{introConfig.description}</p>

          <div style={{ textAlign: 'left', margin: '18px auto', maxWidth: 560 }}>
            <strong>Instructions</strong>
            <ul>
              {introConfig.instructions.map((line) => (
                <li key={line} style={{ marginTop: 6 }}>
                  {line}
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 10, color: '#666' }}>
              Estimated time: {introConfig.estimatedTime}
            </p>
            <p style={{ marginTop: 10, color: '#666' }}>
              Mode: <strong>{mode === 'practice' ? 'Practice' : 'Main Test'}</strong>
            </p>
          </div>

          <Button onClick={begin} style={{ width: '100%', marginTop: 10 }}>
            Begin {mode === 'practice' ? 'Practice' : 'Test'}
          </Button>

          <p style={{ marginTop: 12, fontSize: '0.85rem', color: '#777' }}>
            Trial count: {totalTrials}
          </p>
        </Card>
      </div>
    );
  }

  if (phase === 'stimulus') {
    return (
      <div style={pageStyle}>
        <Card style={cardStyle} title={title}>
          <div style={triggerBoxStyle}>{currentTrial.trigger}</div>
          <div style={timerCircleStyle}>{countdown}</div>

          <p style={{ marginTop: '16px', color: '#777' }}>
            Get ready to choose the matching colour…
          </p>
          <p style={{ marginTop: '8px', fontSize: '0.85rem', color: '#999' }}>
            {mode === 'practice' ? 'Practice' : 'Main'} — Trial {trialIndex + 1} of {totalTrials}
          </p>
        </Card>
      </div>
    );
  }

  // choices
  return (
    <div style={pageStyle}>
      <Card style={cardStyle} title={title}>
        <h2>Pick the correct association</h2>
        <p>Choose the colour that best matches your automatic association.</p>

        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
          <strong>{currentTrial.trigger}</strong>
        </div>

        <div style={optionsGridStyle}>
          {currentTrial.options.map((option) => {
            const isSelected = option.id === selectedOptionId;

            const optionStyle = {
              ...optionBoxBaseStyle,
              backgroundColor: option.color,
              borderColor: isSelected ? '#000' : 'transparent',
              boxShadow: isSelected ? '0 0 0 2px rgba(0, 0, 0, 0.35)' : 'none',
            };

            return (
              <div
                key={option.id}
                style={optionStyle}
                onClick={() => !isSubmitting && setSelectedOptionId(option.id)}
              >
                {option.label}
              </div>
            );
          })}
        </div>

        <Button
          onClick={submitAndNext}
          disabled={!selectedOptionId || isSubmitting}
          style={{ width: '100%' }}
        >
          {
            // If we're at the last trial in practice and there is a main deck,
            // prompt the user to start the main test. Otherwise show 'Finish'
            // on the last main trial, or 'Next' for intermediate trials.
            mode === 'practice' && trialIndex + 1 === totalTrials
              ? stimuli.length > 0
                ? 'Start Main Test'
                : 'Finish'
              : mode === 'main' && trialIndex + 1 === totalTrials
              ? 'Finish'
              : 'Next'
          }
        </Button>

        {errorMessage && (
          <p style={{ marginTop: 12, color: '#b00020' }}>{errorMessage}</p>
        )}

        <p style={{ marginTop: 12, fontSize: '0.9rem', color: '#777' }}>
          {mode === 'practice' ? 'Practice' : 'Main'} — Trial {trialIndex + 1} of {totalTrials}
        </p>
      </Card>
    </div>
  );
}

/**
 * SpeedCongruencyTest - Page component
 * Responsibilities (matches your other tests):
 * - define config and stimuli decks
 * - delegate the actual test flow to a base component
 */
export default function SpeedCongruencyTest() {
  const { stimuli, practiceStimuli } = useMemo(() => buildSpeedCongruencyDecks(), []);

  return (
    <SpeedCongruencyTestFlow
      title="SPEED CONGRUENCY TEST"
      introConfig={SPEED_CONFIG}
      stimuli={stimuli}
      practiceStimuli={practiceStimuli}
    />
  );
}
