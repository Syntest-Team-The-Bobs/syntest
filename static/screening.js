/* screening.js — SYNTEST screening flow controller (no deps)
   Routes assumed:
     /screening/<step>        step in {0..5}
     /screening/exit/<code>   code in {A,BC,D,NONE}
   Persists answers to localStorage under "syntest_state".
*/
(() => {
  "use strict";
  console.log("screening.js loaded");

  // -------- URL helpers --------
  const url = new URL(window.location.href);
  const qs  = url.searchParams;
  const path = url.pathname;

  const STEP_REGEX  = /^\/screening\/(\d+)$/;
  const EXIT_PREFIX = "/screening/exit/";

  function getStepFromPath() {
    const m = path.match(STEP_REGEX);
    if (!m) return 0;                      // treat non-matching as step 0
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? Math.max(0, Math.min(5, n)) : 0;
  }
  function goToStep(n)  { window.location.href = `/screening/${n}`; }
  function goExit(code) { window.location.href = `${EXIT_PREFIX}${code}`; }

  // -------- State --------
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
  function saveState(s)    { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
  function clearState()    { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

  // -------- DOM helpers --------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Treat an anchor like a disabled button by removing href temporarily
  function disableAnchor(a, disabled = true) {
    if (!a) return;
    if (disabled) {
      if (!a.dataset.href) a.dataset.href = a.getAttribute("href") || "";
      a.removeAttribute("href");
      a.style.opacity = "0.6";
      a.style.pointerEvents = "none";
      a.setAttribute("aria-disabled", "true");
    } else {
      a.setAttribute("href", a.dataset.href || a.getAttribute("href") || "#");
      a.style.opacity = "1";
      a.style.pointerEvents = "auto";
      a.removeAttribute("aria-disabled");
    }
  }

  // -------- Step controllers --------

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
    disableAnchor(begin, !state.consent);

    if (consent) {
      consent.checked = !!state.consent;
      consent.addEventListener("change", () => {
        state.consent = consent.checked;
        saveState(state);
        disableAnchor(begin, !state.consent);
      });
    }
  }

  // Step 1: Health & Substances — if any checked, exit BC; else step 2
  function setupStep1(state) {
    const card = $(".card"); if (!card) return;

    const keys   = ["drug", "neuro", "medical"];
    const checks = $$('.checkline input[type="checkbox"], .form-check-input[type="checkbox"]', card);

    checks.slice(0, 3).forEach((cb, i) => {
      cb.checked = !!state.health[keys[i]];
      cb.addEventListener("change", () => {
        state.health[keys[i]] = cb.checked;
        saveState(state);
      });
    });

    const confirmBtn = $(".card-actions .btn-dark, .d-flex .btn.btn-dark");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const anyChecked = keys.some(k => !!state.health[k]);
        if (anyChecked) goExit("BC"); else goToStep(2);
      });
    }
  }

  // Step 2: Definition — set Yes/Maybe/No; No routes to Exit A
  function setupStep2(state) {
    const yesCard   = $(".choice-grid .choice-card:nth-child(1)");
    const maybeCard = $(".choice-grid .choice-card:nth-child(2)");
    const noBanner  = $("a.choice-negative");

    if (yesCard)   yesCard.addEventListener("click",  () => { state.definition = "yes";   saveState(state); }, { once:true });
    if (maybeCard) maybeCard.addEventListener("click",() => { state.definition = "maybe"; saveState(state); }, { once:true });
    if (noBanner)  noBanner.addEventListener("click", () => { state.definition = "no";    saveState(state); }, { once:true });

    const continueBtn = $(".page-actions .btn-dark, .d-flex .btn.btn-dark");
    if (continueBtn && continueBtn.tagName === "A") {
      continueBtn.addEventListener("click", () => {
        if (!state.definition) { state.definition = "yes"; saveState(state); }
      }, { once:true });
    }
  }

  // Step 3: Pain/Emotion — Yes → Exit D, No → Step 4
  function setupStep3(state) {
    const radios = $$('input[name="pain_emotion"]');
    const cont   = $(".btn-continue, .page-actions .btn-dark, .d-flex .btn.btn-dark");
    if (!radios.length || !cont) return;

    if (cont.tagName === "BUTTON") cont.disabled = !state.painEmotion;

    radios.forEach(r => {
      if (state.painEmotion && r.value === state.painEmotion) r.checked = true;
      r.addEventListener("change", () => {
        state.painEmotion = r.value;
        saveState(state);
        if (cont.tagName === "BUTTON") cont.disabled = false;
      });
    });

    cont.addEventListener("click", (e) => {
      if (!state.painEmotion) return;
      if (cont.tagName === "BUTTON") {
        e.preventDefault();
        if (state.painEmotion === "yes") goExit("D"); else goToStep(4);
      } else {
        if (state.painEmotion === "yes") { e.preventDefault(); goExit("D"); }
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
      $$(`input[type="radio"][name="${g.name}"]`).forEach(r => {
        if (state.types[g.name] === r.value) r.checked = true;
        r.addEventListener("change", () => { state.types[g.name] = r.value; saveState(state); });
      });
    });

    const other = $(".other-input");
    if (other) {
      other.value = state.other || "";
      other.addEventListener("input", () => { state.other = other.value.trim(); saveState(state); });
    }

    const next = $(".page-actions .btn-dark, .d-flex .btn.btn-dark");
    if (next) {
      next.addEventListener("click", (e) => {
        e.preventDefault();
        const selected = [];
        if (["yes","sometimes"].includes(state.types.grapheme)) selected.push("Grapheme – Color");
        if (["yes","sometimes"].includes(state.types.music))    selected.push("Music – Color");
        if (["yes","sometimes"].includes(state.types.lexical))  selected.push("Lexical – Taste");
        if (["yes","sometimes"].includes(state.types.sequence)) selected.push("Sequence – Space");

        const otherVal = (state.other || "").trim();
        if (otherVal) selected.push(`Other: ${otherVal}`);

        state.selectedTypes = selected;
        saveState(state);

        if (selected.length === 0) goExit("NONE"); else goToStep(5);
      });
    }
  }

  // Step 5: Show tags from state
  function setupStep5(state) {
    const tagRow = $(".tag-row"); if (!tagRow) return;
    const selected = Array.isArray(state.selectedTypes) ? state.selectedTypes : [];
    if (!selected.length) return;

    tagRow.innerHTML = "";
    selected.forEach(txt => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = txt;
      tagRow.appendChild(span);
    });
  }

  // -------- Boot --------
  document.addEventListener("DOMContentLoaded", () => {
    // Quick reset helper: /screening/<step>?reset=1
    if (qs.get("reset") === "1") { clearState(); }

    const step = getStepFromPath();
    let state = loadState();

    // On first page, if no consent yet, start clean (avoid stale)
    if (step === 0 && !state.consent) { clearState(); state = loadState(); }

    switch (step) {
      case 0: setupStep0(state); break;
      case 1: setupStep1(state); break;
      case 2: setupStep2(state); break;
      case 3: setupStep3(state); break;
      case 4: setupStep4(state); break;
      case 5: setupStep5(state); break;
      default: /* not a flow page */ break;
    }
  });
})();
