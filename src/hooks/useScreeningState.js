import { useEffect, useState } from 'react';

export const SCREENING_STORAGE_KEY = 'screening_state';

export const defaultScreeningState = () => ({
  consent: false,
  health: {
    drug: false,
    neuro: false,
    medical: false,
  },
  definition: null, // 'yes' | 'maybe' | 'no'
  pain: null, // 'yes' | 'no'
  synTypes: {
    grapheme: null,
    music: null,
    lexical: null,
    sequence: null,
  },
  otherExperiences: '',
});

const readFromStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const saved = window.sessionStorage.getItem(SCREENING_STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
};

export default function useScreeningState() {
  const [state, setState] = useState(() => readFromStorage() ?? defaultScreeningState());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.sessionStorage.setItem(SCREENING_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const clearState = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SCREENING_STORAGE_KEY);
    }
    setState(defaultScreeningState());
  };

  const handleHealthChange = (field, checked) => {
    setState((prev) => ({
      ...prev,
      health: {
        ...prev.health,
        [field]: checked,
      },
    }));
  };

  const handleSynTypesChange = (type, value) => {
    setState((prev) => ({
      ...prev,
      synTypes: {
        ...prev.synTypes,
        [type]: value,
      },
    }));
  };

  return {
    state,
    updateState,
    clearState,
    handleHealthChange,
    handleSynTypesChange,
  };
}
