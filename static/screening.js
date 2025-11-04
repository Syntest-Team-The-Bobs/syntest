/* screening.js — SYNTEST screening flow controller
   Routes assumed:
     /screening/<step>        step in {0..5}
     /screening/exit/<code>   code in {A,BC,D,NONE}
   Persists answers to localStorage under "syntest_state".
   
   This module now uses the modular screening components:
   - screening-state.js: State management
   - screening-api.js: API calls
   - screening-dom.js: DOM manipulation
   - screening-router.js: Navigation/routing
   - screening-steps.js: Step controllers
*/
(() => {
  "use strict";
  console.log("screening.js loaded");

  // Note: The following code has been moved to separate modules:
  // - URL helpers → screening-router.js
  // - State management → screening-state.js
  // - API calls → screening-api.js
  // - DOM helpers → screening-dom.js
  // - Step controllers → screening-steps.js
  // - Progress bar updates → screening-dom.js

  // -------- URL helpers --------
  // Moved to screening-router.js
  // const EXIT_PREFIX = "/screening/exit/";
  // const STEP_REGEX  = /^\/screening\/(\d+)$/;
  // function getStepFromPath() { ... }
  // function getQueryParams() { ... }
  // function goToStep(n) { ... }
  // function goExit(code) { ... }

  // -------- State --------
  // Moved to screening-state.js
  // const STORAGE_KEY = "syntest_state";
  // function defaultState() { ... }
  // function loadState() { ... }
  // function saveState(s) { ... }
  // function clearState() { ... }

  // -------- API calls to save to database --------
  // Moved to screening-api.js
  // async function saveConsent(consent) { ... }
  // async function saveStep1(health) { ... }
  // async function saveStep2(definition) { ... }
  // async function saveStep3(painEmotion) { ... }
  // async function saveStep4(types, other) { ... }
  // async function finalizeScreening() { ... }

  // -------- DOM helpers --------
  // Moved to screening-dom.js
  // const $  = (sel, root = document) => root.querySelector(sel);
  // const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  // function disableAnchor(a, disabled = true) { ... }
  // function updateProgressBar(step) { ... }

  // -------- Step controllers --------
  // Moved to screening-steps.js
  // function setupStep0(state) { ... }
  // function setupStep1(state) { ... }
  // function setupStep2(state) { ... }
  // function setupStep3(state) { ... }
  // function setupStep4(state) { ... }
  // function setupStep5(state) { ... }

  // -------- Boot --------
  document.addEventListener("DOMContentLoaded", () => {
    const qs = window.ScreeningRouter.getQueryParams();
    // Quick reset helper: /screening/<step>?reset=1
    if (qs.get("reset") === "1") { 
      window.ScreeningState.clearState(); 
    }

    const step = window.ScreeningRouter.getStepFromPath();
    console.log("Current step from path:", step);  // Debug log
    let state = window.ScreeningState.loadState();

    // On first page, if no consent yet, start clean (avoid stale)
    if (step === 0 && !state.consent) { 
      window.ScreeningState.clearState(); 
      state = window.ScreeningState.loadState(); 
    }

    // Update progress bar based on current step
    // Run immediately first
    window.ScreeningDOM.updateProgressBar(step);
    
    // Use setTimeout to ensure DOM is fully rendered
    setTimeout(() => {
      window.ScreeningDOM.updateProgressBar(step);
    }, 50);
    
    // Also update after a short delay in case of template rendering issues
    setTimeout(() => {
      window.ScreeningDOM.updateProgressBar(step);
    }, 200);
    
    // Final check after everything loads
    setTimeout(() => {
      window.ScreeningDOM.updateProgressBar(step);
    }, 1000);

    switch (step) {
      case 0: window.ScreeningSteps.setupStep0(state); break;
      case 1: window.ScreeningSteps.setupStep1(state); break;
      case 2: window.ScreeningSteps.setupStep2(state); break;
      case 3: window.ScreeningSteps.setupStep3(state); break;
      case 4: window.ScreeningSteps.setupStep4(state); break;
      case 5: window.ScreeningSteps.setupStep5(state); break;
      default: /* not a flow page */ break;
    }
  });
  
  // Also update on window load as a fallback
  window.addEventListener('load', () => {
    const step = window.ScreeningRouter.getStepFromPath();
    if (step >= 1 && step <= 5) {
      window.ScreeningDOM.updateProgressBar(step);
    }
  });
})();

