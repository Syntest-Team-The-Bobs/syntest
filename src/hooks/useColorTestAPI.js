import { useState } from 'react';

/**
 * useColorTestAPI - Hook for submitting color test data to the backend
 * 
 * This is separate from useColorTest.js which manages test flow.
 * This hook handles API communication to save trial data.
 */


export const useColorTestAPI = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submitTrial = async (trialData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/color-test/trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for session cookies
        body: JSON.stringify({
          trial_index: trialData.trial_index,
          selected_r: trialData.selected_color?.r ?? null,
          selected_g: trialData.selected_color?.g ?? null,
          selected_b: trialData.selected_color?.b ?? null,
          response_ms: trialData.response_ms,
          meta_json: {
            test_type: trialData.test_type,
            stimulus: trialData.stimulus,
            no_synesthetic_experience: trialData.no_synesthetic_experience || false,
            browser: navigator.userAgent,
            timestamp: new Date().toISOString(),
            ...trialData.meta
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save trial');
      }

      return result;
    } catch (err) {
      console.error('Error submitting trial:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitBatch = async (trials, testType) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const formattedTrials = trials.map((trial, index) => ({
        trial_index: index,
        selected_r: trial.selectedColor?.r ?? null,
        selected_g: trial.selectedColor?.g ?? null,
        selected_b: trial.selectedColor?.b ?? null,
        response_ms: trial.reactionTime,
        meta_json: {
          test_type: testType,
          stimulus: trial.stimulus,
          no_synesthetic_experience: trial.noSynestheticExperience || false,
          browser: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }));

      const response = await fetch('/api/color-test/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          trials: formattedTrials
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save trials');
      }

      return result;
    } catch (err) {
      console.error('Error submitting batch:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitTrial,
    submitBatch,
    isSubmitting,
    error
  };
};