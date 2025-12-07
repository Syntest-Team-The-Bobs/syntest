// src/pages/trigger_color/SpeedCongruencyTest.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { speedCongruencyService } from '../../services/speedCongruency';
import { musicPlayer } from '../../services/audioPlayer';

/**
  * Speed Congruency Test Configuration
  * Defines test content and instructions for speeded color associations
 */
const SPEED_CONFIG = {
  title: 'Speed Congruency Test',
  description:
    'In this test, you will see a trigger (letter/number/word). Choose the color you most strongly associate with it as quickly and accurately as possible.',
  instructions: [
    'You will see a trigger briefly, then the trigger will appear in a color',
    'Click "Yes" if that color matches your association, or "No" if it does not.',
    'We record reaction time and accuracy.',
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
  {
    id: 't4',
    trigger: 'NEON',
    expectedOptionId: 'o1',
    options: [
      { id: 'o1', label: 'NEON', color: '#39FF14' },
      { id: 'o2', label: 'NEON', color: '#FF5A5F' },
      { id: 'o3', label: 'NEON', color: '#0A84FF' },
      { id: 'o4', label: 'NEON', color: '#FFFF66' },
    ],
  },
  // Music example: plays a short piano note 3 times before showing the color box
  // Requires a user gesture (Begin) to unlock audio in most browsers.
  {
    id: 't5',
    trigger: 'SOUND',
    stimulus: 'C4-piano',
    expectedOptionId: 'o1',
    options: [
      { id: 'o1', label: 'SOUND', color: '#AF52DE' },
      { id: 'o2', label: 'SOUND', color: '#34C759' },
      { id: 'o3', label: 'SOUND', color: '#007AFF' },
      { id: 'o4', label: 'SOUND', color: '#FF3B30' },
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

  // Track which color is displayed and whether it matches the expected association
  const [displayedOptionId, setDisplayedOptionId] = useState(null);
  const [isCongruent, setIsCongruent] = useState(null);

  const choiceStartRef = useRef(null);

  const deck = mode === 'practice' ? practiceStimuli : stimuli;
  const totalTrials = deck.length;
  const currentTrial = deck[trialIndex] || null;

  // Start stimulus behavior when entering stimulus phase
  // - For visual/text triggers: run a countdown (seconds)
  // - For music triggers (currentTrial.stimulus present): play the audio 3 times
  //   with a 2s gap between plays, then advance to choices.
  useEffect(() => {
    if (phase !== 'stimulus' || !currentTrial) return;

    // Initialize congruency for this trial if not already set
    if (isCongruent === null) {
      const congruent = Math.random() < 0.5;
      setIsCongruent(congruent);
      
      if (congruent) {
        setDisplayedOptionId(currentTrial.expectedOptionId);
      } else {
        const otherOptions = currentTrial.options.filter(
          (o) => o.id !== currentTrial.expectedOptionId
        );
        if (otherOptions.length > 0) {
          const randomOther = otherOptions[Math.floor(Math.random() * otherOptions.length)];
          setDisplayedOptionId(randomOther.id);
        } else {
          setDisplayedOptionId(currentTrial.expectedOptionId);
          setIsCongruent(true);
        }
      }
      // Return early so countdown starts after congruency is set
      return;
    }

    // If the trial contains an audio stimulus string (music test), play it
    if (currentTrial.stimulus) {
      let cancelled = false;
      // we show a small play-countdown (3 -> 0) in the UI
      setCountdown(3);

      (async () => {
        try {
          const playMs = 2000; // play duration in ms
          for (let i = 0; i < 3; i++) {
            if (cancelled) break;
            // start playing (musicPlayer.play does not block for duration)
            try {
              musicPlayer.play(currentTrial.stimulus, playMs / 1000);
            } catch (err) {
              console.error('Failed to start play:', err);
            }
            // wait for the play duration
            await new Promise((r) => setTimeout(r, playMs));
            if (cancelled) break;
            // decrement visible countdown (plays remaining)
            setCountdown((prev) => Math.max(0, prev - 1));
            // 2 second gap between plays (only between plays)
            if (i < 2) await new Promise((r) => setTimeout(r, 2000));
          }
        } catch (e) {
          console.error('Error during music playback loop:', e);
        }

        if (!cancelled) {
          setPhase('choices');
          choiceStartRef.current = performance.now();
        }
      })();

      return () => {
        cancelled = true;
        try {
          musicPlayer.stop();
        } catch (e) {}
      };
    }

    // Fallback: visual/text countdown (existing behavior)
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
  }, [phase, currentTrial, countdownSeconds, isCongruent, displayedOptionId]);

  const resetForTrial = () => {
    setSelectedOptionId(null);
    setErrorMessage('');
    // Ensure submission state is cleared between trials so the UI doesn't
    // remain disabled if a previous submission failed or was interrupted.
    setIsSubmitting(false);
    choiceStartRef.current = null;
    setDisplayedOptionId(null);
    setIsCongruent(null);
  };

  const begin = () => {
    if (!currentTrial) return;
    resetForTrial();
    
    // Set up congruency for this trial: randomly decide 50/50 whether to show
    // the expected color (congruent) or a different color (incongruent)
    const congruent = Math.random() < 0.5;
    setIsCongruent(congruent);
    
    if (congruent) {
      // Show the expected/associated color
      setDisplayedOptionId(currentTrial.expectedOptionId);
    } else {
      // Show a different color (random from non-expected options)
      const otherOptions = currentTrial.options.filter(
        (o) => o.id !== currentTrial.expectedOptionId
      );
      if (otherOptions.length > 0) {
        const randomOther = otherOptions[Math.floor(Math.random() * otherOptions.length)];
        setDisplayedOptionId(randomOther.id);
      } else {
        // Fallback: if no other options, show expected
        setDisplayedOptionId(currentTrial.expectedOptionId);
        setIsCongruent(true);
      }
    }
    
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

  const submitAndNext = async (choiceParam = null) => {
    // Use the provided choice parameter or fall back to selectedOptionId
    const choice = choiceParam !== null ? choiceParam : selectedOptionId;
    if (!currentTrial || !choice || isCongruent === null) return;

    const reactionTimeMs = choiceStartRef.current
      ? performance.now() - choiceStartRef.current
      : null;

    // Congruency test: user's Yes/No response should match whether displayed color
    // is congruent (matches expected association) or incongruent (does not match).
    // - If congruent: correct answer is "Yes" (it matches)
    // - If incongruent: correct answer is "No" (it doesn't match)
    const userSaidYes = choice === 'yes';
    const isCorrect = userSaidYes === isCongruent;

    // Map yes/no to a backend-friendly selected id: 'correct' for matching,
    // otherwise something else (backend treats anything !== 'correct' as wrong).
    const backendSelectedId = isCorrect ? 'correct' : 'incorrect';

    const payload = {
      testType: 'speedCongruency',
      mode, // practice or main
      trialId: currentTrial.id,
      trigger: currentTrial.trigger,
      selectedOptionId: backendSelectedId,
      expectedOptionId: currentTrial.expectedOptionId,
      displayedOptionId: displayedOptionId,
      isCongruent,
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
    padding: '56px 32px',
    fontSize: '3.5rem',
    fontWeight: 700,
    margin: '0 auto 32px',
    maxWidth: '420px',
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

  // helper: compute luminance to pick contrasting text/background
  function hexToLuminance(hex) {
    try {
      const h = hex.replace('#', '');
      const r = parseInt(h.substring(0, 2), 16) / 255;
      const g = parseInt(h.substring(2, 4), 16) / 255;
      const b = parseInt(h.substring(4, 6), 16) / 255;
      const a = [r, g, b].map((c) => {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    } catch (e) {
      return 1; // assume light
    }
  }

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
          <p style={{ marginBottom: '10px', fontSize: '1.15rem' }}>{introConfig.description}</p>

          <div style={{ textAlign: 'left', margin: '18px auto', maxWidth: 560 }}>
            <strong>Instructions</strong>
            <ul>
              {introConfig.instructions.map((line) => (
                <li key={line} style={{ marginTop: 8, fontSize: '1.05rem' }}>
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
    // adjust the Card background when the associated colour is near-white/neon
    const expectedOptionStim = currentTrial.options.find(
      (o) => o.id === currentTrial.expectedOptionId
    );
    const displayedColorStim = expectedOptionStim ? expectedOptionStim.color : '#000000';
    const lumStim = hexToLuminance(displayedColorStim);
    const cardBgStim = lumStim > 0.6 ? '#111' : '#fff';
    const cardTextColorStim = lumStim > 0.6 ? '#fff' : '#000';

    return (
      <div style={pageStyle}>
        <Card style={{ ...cardStyle, backgroundColor: cardBgStim }} title={title}>
          <div style={{ ...triggerBoxStyle, color: displayedColorStim, backgroundColor: 'transparent' }}>
            {currentTrial.trigger}
          </div>
          <div style={timerCircleStyle}>{countdown}</div>

          <p style={{ marginTop: '16px', color: cardTextColorStim === '#000' ? '#777' : '#ddd', fontSize: '1.15rem' }}>
            {currentTrial.stimulus ? `Playing sound — plays remaining: ${countdown}` : 'Get ready to choose the matching colour…'}
          </p>
          <p style={{ marginTop: '8px', fontSize: '0.95rem', color: cardTextColorStim === '#000' ? '#999' : '#ccc' }}>
            {mode === 'practice' ? 'Practice' : 'Main'} — Trial {trialIndex + 1} of {totalTrials}
          </p>
        </Card>
      </div>
    );
  }
  // choices: show the trigger rendered in the (expected) associated colour
  // and present Yes / No buttons. Clicking either records RT and submits.
  const expectedOption = currentTrial.options.find(
    (o) => o.id === currentTrial.expectedOptionId
  );

  const displayedColor = expectedOption ? expectedOption.color : '#000000';
  const lum = hexToLuminance(displayedColor);
    // The trigger text should be rendered in the associated colour itself
  const triggerTextColor = displayedColor;

  // Do not change the whole page background; we'll change the Card background instead
  const choicePageStyle = { ...pageStyle };

  const colouredTriggerStyle = {
    borderRadius: 12,
    padding: '36px 24px',
    fontSize: '5rem',
    lineHeight: 1,
    fontWeight: 800,
    backgroundColor: 'transparent',
    color: triggerTextColor,
    display: 'inline-block',
    minWidth: 220,
    textAlign: 'center',
    margin: '12px auto',
  };

  const isMusic = !!currentTrial.stimulus;

  const colorBoxStyle = {
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: displayedColor,
    display: 'inline-block',
    margin: '12px auto',
    boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    border: '3px solid rgba(0,0,0,0.08)'
  };

  const yesNoRowStyle = {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginTop: 20,
  };

  const handleYesNo = async (choice) => {
    if (isSubmitting) return;
    await submitAndNext(choice);
  };

  const cardBg = lum > 0.6 ? '#111' : '#fff';
  const cardTextColor = lum > 0.6 ? '#fff' : '#000';
  const buttonVariant = lum > 0.6 ? 'secondary' : 'primary';

  return (
    <div style={choicePageStyle}>
      <Card style={{ ...cardStyle, backgroundColor: cardBg }} title={title}>
        <h2 style={{ fontSize: '1.25rem', color: cardTextColor }}>Speed Congruency</h2>
        <p style={{ fontSize: '1.15rem', color: cardTextColor }}>Does this colour match your automatic association for the trigger?</p>

        <div style={{ marginTop: '16px', marginBottom: '8px' }}>
          {isMusic ? (
            <div style={colorBoxStyle} aria-label="color-box" />
          ) : (
            <div style={colouredTriggerStyle}>{currentTrial.trigger}</div>
          )}
        </div>

        <div style={yesNoRowStyle}>
          <Button
            variant={buttonVariant}
            onClick={() => handleYesNo('yes')}
            disabled={isSubmitting}
            style={{ minWidth: 140 }}
          >
            Yes
          </Button>

          <Button
            variant={buttonVariant}
            onClick={() => handleYesNo('no')}
            disabled={isSubmitting}
            style={{ minWidth: 140 }}
          >
            No
          </Button>
        </div>

        {errorMessage && (
          <p style={{ marginTop: 12, color: cardTextColor === '#000' ? '#b00020' : '#ff6b6b' }}>{errorMessage}</p>
        )}

        <p style={{ marginTop: 12, fontSize: '0.9rem', color: cardTextColor === '#000' ? '#777' : '#ccc' }}>
          {mode === 'practice' ? 'Practice' : 'Main'} — Trial {trialIndex + 1} of {totalTrials}
        </p>
      </Card>
    </div>
  );
}

/**
 * SpeedCongruencyTest - Page component
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

