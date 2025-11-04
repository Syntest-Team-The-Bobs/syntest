/* screening-router.js — Routing and navigation for screening flow
   Handles URL parsing and navigation between steps.
*/
(() => {
  "use strict";

  const EXIT_PREFIX = "/screening/exit/";
  const STEP_REGEX  = /^\/screening\/(\d+)$/;

  function getStepFromPath() {
    // Always read the current path from window.location, not a cached value
    const currentPath = window.location.pathname;
    const m = currentPath.match(STEP_REGEX);
    if (!m) return 0;                      // treat non-matching as step 0
    const n = parseInt(m[1], 10);
    // Ensure step is between 0 and 5
    const step = Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
    return step;
  }
  
  function getQueryParams() {
    return new URLSearchParams(window.location.search);
  }

  function goToStep(n) {
    window.location.href = `/screening/${n}`;
  }

  function goExit(code) {
    window.location.href = `${EXIT_PREFIX}${code}`;
  }

  // Export to window for use by other modules
  window.ScreeningRouter = {
    getStepFromPath,
    getQueryParams,
    goToStep,
    goExit
  };
})();

