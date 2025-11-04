/* screening-state.js — State management for screening flow
   Handles localStorage persistence and state initialization.
*/
(() => {
  "use strict";

  const STORAGE_KEY = "syntest_state";

  function defaultState() {
    return {
      consent: false,
      health: { drug: false, neuro: false, medical: false },
      definition: null,        // 'yes' | 'maybe' | 'no'
      painEmotion: null,       // 'yes' | 'no'
      types: {                 // 'yes' | 'sometimes' | 'no'
        grapheme: null,
        music: null,
        lexical: null,
        sequence: null
      },
      other: "",
      selectedTypes: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const obj = JSON.parse(raw);
      return {
        ...defaultState(),
        ...obj,
        health: { ...defaultState().health, ...(obj.health || {}) },
        types:  { ...defaultState().types,  ...(obj.types  || {}) }
      };
    } catch {
      return defaultState();
    }
  }

  function saveState(s) {
    try { 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); 
    } catch {}
  }

  function clearState() {
    try { 
      localStorage.removeItem(STORAGE_KEY); 
    } catch {}
  }

  // Export to window for use by other modules
  window.ScreeningState = {
    defaultState,
    loadState,
    saveState,
    clearState
  };
})();

