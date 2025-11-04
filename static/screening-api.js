/* screening-api.js — API client for screening flow
   Handles all API calls to save screening data to the database.
*/
(() => {
  "use strict";

  async function saveConsent(consent) {
    try {
      const res = await fetch('/api/screening/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: consent })
      });
      if (!res.ok) console.error('Failed to save consent:', res.status);
      return res.ok;
    } catch (err) {
      console.error('Error saving consent:', err);
      return false;
    }
  }

  async function saveStep1(health) {
    try {
      const res = await fetch('/api/screening/step/1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drug: health.drug || false,
          neuro: health.neuro || false,
          medical: health.medical || false
        })
      });
      if (!res.ok) console.error('Failed to save step 1:', res.status);
      return res.ok;
    } catch (err) {
      console.error('Error saving step 1:', err);
      return false;
    }
  }

  async function saveStep2(definition) {
    try {
      const res = await fetch('/api/screening/step/2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: definition })
      });
      if (!res.ok) console.error('Failed to save step 2:', res.status);
      return res.ok;
    } catch (err) {
      console.error('Error saving step 2:', err);
      return false;
    }
  }

  async function saveStep3(painEmotion) {
    try {
      const res = await fetch('/api/screening/step/3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: painEmotion })
      });
      if (!res.ok) console.error('Failed to save step 3:', res.status);
      return res.ok;
    } catch (err) {
      console.error('Error saving step 3:', err);
      return false;
    }
  }

  async function saveStep4(types, other) {
    try {
      const res = await fetch('/api/screening/step/4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grapheme: types.grapheme || null,
          music: types.music || null,
          lexical: types.lexical || null,
          sequence: types.sequence || null,
          other: other || null
        })
      });
      if (!res.ok) console.error('Failed to save step 4:', res.status);
      return res.ok;
    } catch (err) {
      console.error('Error saving step 4:', err);
      return false;
    }
  }

  async function finalizeScreening() {
    try {
      const res = await fetch('/api/screening/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) console.error('Failed to finalize screening:', res.status);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Error finalizing screening:', err);
      return null;
    }
  }

  // Export to window for use by other modules
  window.ScreeningAPI = {
    saveConsent,
    saveStep1,
    saveStep2,
    saveStep3,
    saveStep4,
    finalizeScreening
  };
})();

