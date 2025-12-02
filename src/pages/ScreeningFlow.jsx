import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import ScreeningStep from '../components/screening/ScreeningStep';
import ChoiceCard from '../components/screening/ChoiceCard';
import TypeRow from '../components/screening/TypeRow';
import useScreeningState from '../hooks/useScreeningState';
import { screeningService } from '../services/screening';
import '../styles/app.css';

const SUMMARY_STORAGE_KEY = 'screening_summary';

export default function ScreeningFlow() {
  const { step: stepParam } = useParams();
  const step = Number(stepParam ?? 0);
  const navigate = useNavigate();
  const {
    state,
    updateState,
    clearState,
    handleHealthChange,
    handleSynTypesChange,
  } = useScreeningState();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const stored = window.sessionStorage.getItem(SUMMARY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    setError(null);
  }, [step]);

  const persistSummary = useCallback((payload) => {
    setSummary(payload);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(payload));
    }
  }, []);

  const resetSummary = useCallback(() => {
    setSummary(null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SUMMARY_STORAGE_KEY);
    }
  }, []);

  const withSaving = useCallback(async (fn) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      console.error('Screening step failed', err);
      const serverMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to save your responses. Please try again.';
      setError(serverMessage);
    } finally {
      setSaving(false);
    }
  }, []);

  const hasHealthExclusions = useMemo(
    () => Object.values(state.health).some(Boolean),
    [state.health],
  );

  const hasEligibleType = useMemo(
    () =>
      Object.values(state.synTypes).some(
        (value) => value === 'yes' || value === 'sometimes',
      ),
    [state.synTypes],
  );

  useEffect(() => {
    if (step !== 5 || summary) {
      return;
    }
    let isMounted = true;
    (async () => {
      setSaving(true);
      setError(null);
      try {
        const result = await screeningService.finalize();
        if (!isMounted) {
          return;
        }
        persistSummary(result);
        if (result?.exit_code && !result?.eligible) {
          navigate(`/screening/exit/${result.exit_code}`);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }
        console.error('Failed to finalize screening', err);
        const serverMessage =
          err?.response?.data?.message ||
          err?.message ||
          'Unable to fetch your recommended tests. Please try again.';
        setError(serverMessage);
      } finally {
        if (isMounted) {
          setSaving(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [navigate, persistSummary, step, summary]);

  const startAssignedTests = () => {
    clearState();
    resetSummary();
    navigate('/participant/dashboard');
  };

  const summarySelectedTypes =
    summary?.selected_types || summary?.selectedTypes || [];
  const summaryRecommendations =
    summary?.recommended || summary?.recommended_tests || [];

  const handleConsentSubmit = () => {
    if (!state.consent || saving) {
      return;
    }
    withSaving(async () => {
      await screeningService.saveConsent(state.consent);
      navigate('/screening/1');
    });
  };

  const handleStep1Next = () => {
    withSaving(async () => {
      await screeningService.saveStep1(state.health);
      if (hasHealthExclusions) {
        resetSummary();
        navigate('/screening/exit/BC');
      } else {
        navigate('/screening/2');
      }
    });
  };

  const handleStep2Next = () => {
    if (!state.definition) {
      setError('Select the option that best fits you to continue.');
      return;
    }
    withSaving(async () => {
      await screeningService.saveStep2(state.definition);
      if (state.definition === 'no') {
        resetSummary();
        navigate('/screening/exit/A');
      } else {
        navigate('/screening/3');
      }
    });
  };

  const handleStep3Next = () => {
    if (!state.pain) {
      setError('Select an option to continue.');
      return;
    }
    withSaving(async () => {
      await screeningService.saveStep3(state.pain);
      if (state.pain === 'yes') {
        resetSummary();
        navigate('/screening/exit/D');
      } else {
        navigate('/screening/4');
      }
    });
  };

  const handleStep4Next = () => {
    // Prevent multiple clicks while saving
    if (saving) {
      return;
    }
    // Always save step 4 data before navigating, even if no eligible types
    // This ensures the database has the complete screening data for analysis
    withSaving(async () => {
      try {
        await screeningService.saveStep4(state.synTypes, state.otherExperiences);
        if (!hasEligibleType) {
          // Finalize to determine exit code, then navigate to exit page
          const result = await screeningService.finalize();
          resetSummary();
          if (result?.exit_code) {
            navigate(`/screening/exit/${result.exit_code}`);
          } else {
            navigate('/screening/exit/NONE');
          }
        } else {
          resetSummary();
          navigate('/screening/5');
        }
      } catch (err) {
        // Error is already handled by withSaving, but ensure we don't navigate on error
        console.error('Step 4 save failed:', err);
        // Don't navigate if there's an error - let user retry
        throw err;
      }
    });
  };

  // Step 0: Intro
  if (step === 0) {
    return (
      <ScreeningStep
        step={0}
        totalSteps={5}
        title="Take the questionnaire"
        showActions={false}
        error={error}
      >
        <p className="lead">
          In this first screening, we'll check basic eligibility and your experiences.
        </p>

        <label className="checkbox-group" htmlFor="consent">
          <input
            id="consent"
            type="checkbox"
            checked={state.consent}
            onChange={(e) => updateState({ consent: e.target.checked })}
            data-audit-label="Consent agreement"
          />
          <span>I consent to take part in this study.</span>
        </label>

        <p className="text-muted mb-3">
          By checking this box, you acknowledge that you have read and understood the study
          information sheet, agree to participate voluntarily, and consent to the collection
          and use of your data for research purposes. You may withdraw at any time without penalty.
        </p>

        <Button
          id="begin-screening"
          className="btn-block"
          disabled={!state.consent || saving}
          onClick={handleConsentSubmit}
        >
          {saving ? 'Saving…' : 'Begin screening'}
        </Button>
      </ScreeningStep>
    );
  }

  // Step 1: Health & Substances
  if (step === 1) {
    return (
      <ScreeningStep
        step={1}
        totalSteps={5}
        chip={{ label: 'Health & Substances', variant: 'primary' }}
        title="Confirm none apply to you:"
        onNext={handleStep1Next}
        nextLabel={hasHealthExclusions ? 'Exit study' : 'Continue'}
        loading={saving}
        error={error}
      >
        <Checkbox
          children="Use of recreational drugs including marijuana, LSD, or psychedelics"
          checked={state.health.drug}
          onChange={(e) => handleHealthChange('drug', e.target.checked)}
          data-audit-label="Substance exclusion — recreational drugs"
        />
        <Checkbox
          children="Neurological condition or treatment affecting perception"
          checked={state.health.neuro}
          onChange={(e) => handleHealthChange('neuro', e.target.checked)}
          data-audit-label="Substance exclusion — neurological condition"
        />
        <Checkbox
          children="Medical treatment impacting perception (e.g., brain tumor) or hallucinogenic physiology"
          checked={state.health.medical}
          onChange={(e) => handleHealthChange('medical', e.target.checked)}
          data-audit-label="Substance exclusion — medical treatment"
        />
        <p className="text-muted">If any are checked, you're not eligible.</p>
      </ScreeningStep>
    );
  }

  // Step 2: Definition
  if (step === 2) {
    return (
      <ScreeningStep
        step={2}
        totalSteps={5}
        chip={{ label: 'Definition', variant: 'info' }}
        title="What is synesthesia?"
        onNext={handleStep2Next}
        nextLabel="Continue"
        nextDisabled={!state.definition || saving}
        loading={saving}
        error={error}
      >
        <p>
          Synesthesia is a neurological condition where stimulation of <em>one</em> sense automatically
          triggers a perception in another sense. It's not a metaphor, a mood-based association,
          or a one-time experience—it's a consistent, involuntary sensory connection that occurs
          throughout a person's life.
        </p>

        <div className="grid-2">
          <div>
            <div className="label-uppercase">DO</div>
            <ul className="arrow-list">
              <li>
                <span className="arrow"></span> Letters → Colors
              </li>
              <li>
                <span className="arrow"></span> Music → Colors
              </li>
              <li>
                <span className="arrow"></span> Words → Tastes
              </li>
            </ul>
          </div>
          <div>
            <div className="label-uppercase">DON'T</div>
            <ul className="plain-list">
              <li>Mnemonics</li>
              <li>Guesses</li>
              <li>Random choices</li>
            </ul>
          </div>
        </div>

        <div className="choice-grid">
          <ChoiceCard
            title="Yes"
            subtitle="I experience consistent sensory connections"
            selected={state.definition === 'yes'}
            onClick={() => updateState({ definition: 'yes' })}
            data-audit-label="Definition choice — yes"
          />
          <ChoiceCard
            title="Maybe"
            subtitle="I'm not sure if my experiences qualify"
            selected={state.definition === 'maybe'}
            onClick={() => updateState({ definition: 'maybe' })}
            data-audit-label="Definition choice — maybe"
          />
        </div>
        <ChoiceCard
          variant="negative"
          title="No — exit per criterion A"
          subtitle="I don't experience these sensory connections"
          selected={state.definition === 'no'}
          onClick={() => updateState({ definition: 'no' })}
          data-audit-label="Definition choice — no"
        />
      </ScreeningStep>
    );
  }

  // Step 3: Pain & Emotion
  if (step === 3) {
    return (
      <ScreeningStep
        step={3}
        totalSteps={5}
        chip={{ label: 'Pain & Emotion', variant: 'info' }}
        title="Are your triggers pain or emotions?"
        onNext={handleStep3Next}
        nextLabel={state.pain === 'yes' ? 'Exit study' : 'Continue'}
        nextDisabled={!state.pain}
        loading={saving}
        error={error}
      >
        <p>
          For ethical and replicability reasons, we must exclude synesthetic experiences that are primarily
          triggered by pain or strong emotions. We're looking for consistent, automatic associations with
          neutral stimuli.
        </p>

        <div className="info-panel">
          <ul className="info-rows">
            <li>
              <span className="i bolt"></span>
              <span className="info-label">Pain</span>
              <span className="info-text">→ flashes of light or color</span>
            </li>
            <li>
              <span className="i heart"></span>
              <span className="info-label">Emotion</span>
              <span className="info-text">→ specific tastes or smells</span>
            </li>
            <li>
              <span className="i dot"></span>
              <span className="info-label">Valid example:</span>
              <span className="info-text">The neutral word "Tuesday" consistently tastes sweet</span>
            </li>
          </ul>
        </div>

        <div className="select-list">
          <label className="select-card">
            <input
              type="radio"
              name="pain_emotion"
              value="yes"
              checked={state.pain === 'yes'}
              onChange={(e) => updateState({ pain: e.target.value })}
              data-audit-label="Pain/emotion trigger — yes"
            />
            <div className="select-body">
              <div className="select-title">Yes</div>
              <div className="select-subtitle">
                My experiences are primarily triggered by pain or strong emotions (exit per criterion D)
              </div>
            </div>
          </label>
          <label className="select-card">
            <input
              type="radio"
              name="pain_emotion"
              value="no"
              checked={state.pain === 'no'}
              onChange={(e) => updateState({ pain: e.target.value })}
              data-audit-label="Pain/emotion trigger — no"
            />
            <div className="select-body">
              <div className="select-title">No</div>
              <div className="select-subtitle">My experiences occur with neutral stimuli</div>
            </div>
          </label>
        </div>
      </ScreeningStep>
    );
  }

  // Step 4: Type Selection
  if (step === 4) {
    return (
      <ScreeningStep
        step={4}
        totalSteps={5}
        chip={{ label: 'Type Selection', variant: 'success' }}
        title="Select any types you experience"
        onNext={handleStep4Next}
        nextLabel="Continue"
        loading={saving}
        error={error}
      >
        <ul className="type-rows">
          <TypeRow
            title="Letter • Color"
            description='Letters/numbers evoke specific colors (e.g., "A" is red).'
            name="grapheme"
            value={state.synTypes.grapheme}
            onChange={(value) => handleSynTypesChange('grapheme', value)}
          />
          <TypeRow
            title="Music/Sound • Color"
            description="Single notes or dyads evoke colors (70 tones testable)."
            name="music"
            value={state.synTypes.music}
            onChange={(value) => handleSynTypesChange('music', value)}
          />
          <TypeRow
            title="Lexical/Word • Taste"
            description="Words evoke tastes via the 5 basic tastes."
            name="lexical"
            value={state.synTypes.lexical}
            onChange={(value) => handleSynTypesChange('lexical', value)}
          />
          <TypeRow
            title="Sequence • Space"
            description="Days, months, or years have fixed spatial layouts."
            name="sequence"
            value={state.synTypes.sequence}
            onChange={(value) => handleSynTypesChange('sequence', value)}
          />
        </ul>

        <input
          id="other-experiences"
          className="other-input"
          type="text"
          placeholder="Other synesthetic experiences (optional)"
          value={state.otherExperiences}
          onChange={(e) => updateState({ otherExperiences: e.target.value })}
          data-mask="true"
          data-audit-label="Other synesthetic experiences free-text"
        />
        <p className="text-muted">
          Only types with available tasks proceed; pain/emotion triggers excluded.
        </p>
      </ScreeningStep>
    );
  }

  // Step 5: Routing Summary
  if (step === 5) {
    return (
      <ScreeningStep
        step={5}
        totalSteps={5}
        chip={{ label: 'Routing', variant: 'info' }}
        title="Your next step"
        nextLabel="Begin assigned tests"
        onNext={startAssignedTests}
        nextDisabled={!summary?.eligible}
        loading={saving}
        error={error}
      >
        {!summary && <p>Fetching your assigned tests…</p>}

        {summary && (
          <>
            <p className="lead">
              {summary.eligible
                ? 'You qualify for the next phase of testing.'
                : 'Screening complete.'}
            </p>

            {summarySelectedTypes.length > 0 ? (
              <div className="summary-note">
                <div className="note-title">Selected types</div>
                <ul className="summary-list">
                  {summarySelectedTypes.map((type) => (
                    <li key={type}>{type}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted">No eligible types recorded.</p>
            )}

            {summaryRecommendations.length > 0 && (
              <>
                <div className="summary-title mt-3">Recommended next steps</div>
                <div className="summary-grid">
                  {summaryRecommendations.map((rec, idx) => (
                    <div className="summary-card" key={`${rec.name}-${idx}`}>
                      <div className="summary-title">{rec.name}</div>
                      {rec.reason && (
                        <div className="summary-sub">{rec.reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </ScreeningStep>
    );
  }

  return null;
}
