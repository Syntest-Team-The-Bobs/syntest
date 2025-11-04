/* screening-steps.js — Step controllers for screening flow
   Handles setup and interaction for each step of the screening process.
*/
(() => {
  "use strict";

  // Step 0: Consent gating
  function setupStep0(state) {
    const consent = document.getElementById("consent")
                   || document.querySelector('.consent input[type="checkbox"]');
    const begin   = document.getElementById("begin-screening")
                   || document.querySelector('a.btn-primary, .btn-primary');
    if (!begin) return;

    // Remember target and set initial disabled state based on saved consent
    const target = begin.dataset.href || begin.getAttribute("href") || "/screening/1";
    begin.dataset.href = target;
    window.ScreeningDOM.disableAnchor(begin, !state.consent);

    if (consent) {
      consent.checked = !!state.consent;
      consent.addEventListener("change", async () => {
        state.consent = consent.checked;
        window.ScreeningState.saveState(state);
        window.ScreeningDOM.disableAnchor(begin, !state.consent);
        // Save consent to database
        await window.ScreeningAPI.saveConsent(state.consent);
      });
    }
  }

  // Step 1: Health & Substances — if any checked, exit BC; else step 2
  function setupStep1(state) {
    const card = window.ScreeningDOM.$(".card"); 
    if (!card) return;

    const keys   = ["drug", "neuro", "medical"];
    const checks = window.ScreeningDOM.$$('.checkline input[type="checkbox"], .form-check-input[type="checkbox"]', card);

    const confirmBtn = window.ScreeningDOM.$(".card-actions .btn-dark, .d-flex .btn.btn-dark");
    
    // Function to update button text based on checkbox state
    function updateButtonText() {
      if (!confirmBtn) return;
      const anyChecked = keys.some(k => !!state.health[k]);
      if (anyChecked) {
        confirmBtn.textContent = "Continue";
      } else {
        confirmBtn.textContent = "I confirm none apply";
      }
    }

    checks.slice(0, 3).forEach((cb, i) => {
      cb.checked = !!state.health[keys[i]];
      cb.addEventListener("change", async () => {
        state.health[keys[i]] = cb.checked;
        window.ScreeningState.saveState(state);
        updateButtonText(); // Update button text when checkbox changes
        // Save health data to database
        await window.ScreeningAPI.saveStep1(state.health);
      });
    });

    // Set initial button text based on saved state
    updateButtonText();

    if (confirmBtn) {
      confirmBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const anyChecked = keys.some(k => !!state.health[k]);
        if (anyChecked) {
          // Finalize screening before exiting
          await window.ScreeningAPI.finalizeScreening();
          window.ScreeningRouter.goExit("BC");
        } else {
          window.ScreeningRouter.goToStep(2);
        }
      });
    }
  }

  // Step 2: Definition — set Yes/Maybe/No; No routes to Exit A
  function setupStep2(state) {
    const yesCard   = window.ScreeningDOM.$(".choice-grid .choice-card[data-choice='yes']") || window.ScreeningDOM.$(".choice-grid .choice-card:nth-child(1)");
    const maybeCard = window.ScreeningDOM.$(".choice-grid .choice-card[data-choice='maybe']") || window.ScreeningDOM.$(".choice-grid .choice-card:nth-child(2)");
    const noBanner  = window.ScreeningDOM.$("a.choice-negative");
    const continueBtn = window.ScreeningDOM.$(".page-actions .btn-dark, .d-flex .btn.btn-dark");

    // Function to update visual selection state
    function updateSelection() {
      // Remove selected class from all cards
      if (yesCard) yesCard.classList.remove('selected');
      if (maybeCard) maybeCard.classList.remove('selected');
      
      // Add selected class to the chosen card
      if (state.definition === "yes" && yesCard) {
        yesCard.classList.add('selected');
      } else if (state.definition === "maybe" && maybeCard) {
        maybeCard.classList.add('selected');
      }
      
      // Enable/disable Continue button based on selection
      if (continueBtn) {
        if (state.definition === "yes" || state.definition === "maybe") {
          continueBtn.style.pointerEvents = 'auto';
          continueBtn.style.opacity = '1';
          continueBtn.removeAttribute('aria-disabled');
        } else {
          continueBtn.style.pointerEvents = 'none';
          continueBtn.style.opacity = '0.5';
          continueBtn.setAttribute('aria-disabled', 'true');
        }
      }
    }

    // Handle Yes card click - prevent navigation, just select
    if (yesCard) {
      yesCard.addEventListener("click", async (e) => {
        e.preventDefault();
        state.definition = "yes";
        window.ScreeningState.saveState(state);
        updateSelection();
        // Save definition to database
        await window.ScreeningAPI.saveStep2(state.definition);
      });
    }

    // Handle Maybe card click - prevent navigation, just select
    if (maybeCard) {
      maybeCard.addEventListener("click", async (e) => {
        e.preventDefault();
        state.definition = "maybe";
        window.ScreeningState.saveState(state);
        updateSelection();
        // Save definition to database
        await window.ScreeningAPI.saveStep2(state.definition);
      });
    }

    // Handle No banner - still navigates directly to exit
    if (noBanner) {
      noBanner.addEventListener("click", async () => {
        state.definition = "no";
        window.ScreeningState.saveState(state);
        // Save definition to database before exiting
        await window.ScreeningAPI.saveStep2(state.definition);
        // Finalize screening since user is exiting
        await window.ScreeningAPI.finalizeScreening();
      });
    }

    // Handle Continue button - only navigate if Yes or Maybe is selected
    if (continueBtn) {
      continueBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (state.definition === "yes" || state.definition === "maybe") {
          window.ScreeningRouter.goToStep(3);
        }
      });
    }

    // Set initial selection state
    updateSelection();
  }

  // Step 3: Pain/Emotion — Yes → Exit D, No → Step 4
  function setupStep3(state) {
    const radios = window.ScreeningDOM.$$('input[name="pain_emotion"]');
    const cont   = window.ScreeningDOM.$(".btn-continue, .page-actions .btn-dark, .d-flex .btn.btn-dark");
    if (!radios.length || !cont) return;

    if (cont.tagName === "BUTTON") cont.disabled = !state.painEmotion;

    radios.forEach(r => {
      if (state.painEmotion && r.value === state.painEmotion) r.checked = true;
      r.addEventListener("change", async () => {
        state.painEmotion = r.value;
        window.ScreeningState.saveState(state);
        if (cont.tagName === "BUTTON") cont.disabled = false;
        // Save pain/emotion answer to database
        await window.ScreeningAPI.saveStep3(state.painEmotion);
      });
    });

    cont.addEventListener("click", async (e) => {
      if (!state.painEmotion) return;
      if (cont.tagName === "BUTTON") {
        e.preventDefault();
        if (state.painEmotion === "yes") {
          await window.ScreeningAPI.finalizeScreening();
          window.ScreeningRouter.goExit("D");
        } else {
          window.ScreeningRouter.goToStep(4);
        }
      } else {
        if (state.painEmotion === "yes") { 
          e.preventDefault();
          await window.ScreeningAPI.finalizeScreening();
          window.ScreeningRouter.goExit("D");
        }
        // else allow native href to step 4
      }
    });
  }

  // Step 4: Type selection — none → Exit NONE; otherwise Step 5
  function setupStep4(state) {
    const groups = [
      { name:"grapheme", title:"Grapheme – Color" },
      { name:"music",    title:"Music – Color" },
      { name:"lexical",  title:"Lexical – Taste" },
      { name:"sequence", title:"Sequence – Space" }
    ];

    groups.forEach(g => {
      window.ScreeningDOM.$$(`input[type="radio"][name="${g.name}"]`).forEach(r => {
        if (state.types[g.name] === r.value) r.checked = true;
        r.addEventListener("change", async () => { 
          state.types[g.name] = r.value; 
          window.ScreeningState.saveState(state);
          // Save type choices to database
          await window.ScreeningAPI.saveStep4(state.types, state.other);
        });
      });
    });

    const other = window.ScreeningDOM.$(".other-input");
    if (other) {
      other.value = state.other || "";
      other.addEventListener("input", async () => { 
        state.other = other.value.trim(); 
        window.ScreeningState.saveState(state);
        // Save other input to database
        await window.ScreeningAPI.saveStep4(state.types, state.other);
      });
    }

    const next = window.ScreeningDOM.$(".page-actions .btn-dark, .d-flex .btn.btn-dark");
    if (next) {
      next.addEventListener("click", async (e) => {
        e.preventDefault();
        const selected = [];
        if (["yes","sometimes"].includes(state.types.grapheme)) selected.push("Grapheme – Color");
        if (["yes","sometimes"].includes(state.types.music))    selected.push("Music – Color");
        if (["yes","sometimes"].includes(state.types.lexical))  selected.push("Lexical – Taste");
        if (["yes","sometimes"].includes(state.types.sequence)) selected.push("Sequence – Space");

        const otherVal = (state.other || "").trim();
        if (otherVal) selected.push(`Other: ${otherVal}`);

        state.selectedTypes = selected;
        window.ScreeningState.saveState(state);
        
        // Final save of step 4 data before moving to step 5
        await window.ScreeningAPI.saveStep4(state.types, state.other);

        if (selected.length === 0) {
          await window.ScreeningAPI.finalizeScreening();
          window.ScreeningRouter.goExit("NONE");
        } else {
          window.ScreeningRouter.goToStep(5);
        }
      });
    }
  }

  // Step 5: Show tags from state
  function setupStep5(state) {
    const tagRow = window.ScreeningDOM.$(".tag-row"); 
    if (!tagRow) return;
    const selected = Array.isArray(state.selectedTypes) ? state.selectedTypes : [];
    if (!selected.length) return;

    tagRow.innerHTML = "";
    selected.forEach(txt => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = txt;
      tagRow.appendChild(span);
    });
    
    // Finalize screening when reaching step 5 (summary page)
    window.ScreeningAPI.finalizeScreening().then(result => {
      if (result) {
        console.log('Screening finalized:', result);
      }
    });
  }

  // Export to window for use by other modules
  window.ScreeningSteps = {
    setupStep0,
    setupStep1,
    setupStep2,
    setupStep3,
    setupStep4,
    setupStep5
  };
})();

