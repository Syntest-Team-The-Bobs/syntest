// ============================================================
// SYNTEST — BaseColorTest (abstract)
// ------------------------------------------------------------
// Purpose:
//   Coordinates a *single* color–matching test flow (UI events,
//   shuffling items, timing, collecting responses, and summarizing).
//   Concrete tests (letters / numbers / words) only provide:
//     - getStimuliSet(): string[]  -> the labels to show (e.g., ["A","B"])
//     - getTitle(): string         -> display name for the results box
//
//
import { WheelRenderer, shuffle } from "./color_shared.js";

/** @typedef {Object} UIRefs
 * @property {HTMLCanvasElement} [wheel]
 * @property {HTMLElement} [dot]
 * @property {HTMLElement} [swatch]
 * @property {HTMLElement} [hex]
 * @property {HTMLElement} [stimulusContent]
 * @property {HTMLElement} [stimulusLabel]
 * @property {HTMLElement} [trialNum]
 * @property {HTMLElement} [trialTotal]
 * @property {HTMLElement} [progress]
 * @property {HTMLButtonElement} [btnNext]
 * @property {HTMLButtonElement} [btnNone]
 * @property {HTMLInputElement} [trialSlider]
 * @property {HTMLElement} [cctSummary]
 * @property {HTMLButtonElement} [helpBtn]
 * @property {HTMLDialogElement} [helpDialog]
 * @property {HTMLButtonElement} [helpClose]
 */

/** Default knobs so every page behaves consistently */
const defaults = Object.freeze({
  trialsPerLabel: 3,   // each item repeats this many times
  wheelSize: 360,      // px for the color wheel canvas
  cutoffDistance: 135  // consistency threshold (lower = more consistent)
});

/** Small guard so we fail *early* and clearly for bad subclass data */
function requireNonEmptyArray(name, value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${name} must be a non-empty array.`);
  }
  return value;
}

/** Pure: build a randomized "deck" of trials (no DOM involved). */
export function buildTrialDeck(items, trialsPerLabel) {
  requireNonEmptyArray("items", items);
  if (!(Number.isInteger(trialsPerLabel) && trialsPerLabel > 0)) {
    throw new Error("trialsPerLabel must be a positive integer.");
  }

  const idMap = new Map(items.map((label, i) => [label, i + 1]));
  const blocks = [];

  for (let t = 1; t <= trialsPerLabel; t++) {
    const order = shuffle([...items]); // new random order per trial
    for (const label of order) {
      blocks.push({ stimulus_id: idMap.get(label), label, trial_index: t });
    }
  }

  return Object.freeze({
    order: blocks,               // flattened list of trial steps
    itemsPerTrial: items.length, // how many unique items per trial block
    total: blocks.length
  });
}

/** Pure: summarize consistency from an array of recorded trials. */
export function computeConsistencyMetrics(trials, cutoffDistance) {
  // Keep only entries where a color was chosen (skip "no color")
  const byLabel = new Map();
  for (const t of trials) {
    if (!t?.rgb) continue;
    if (!byLabel.has(t.label)) byLabel.set(t.label, []);
    byLabel.get(t.label).push([t.rgb.r, t.rgb.g, t.rgb.b]);
  }

  // Pairwise distances within each label
  const dists = [];
  for (const [, cols] of byLabel) {
    for (let i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        const a = cols[i], b = cols[j];
        dists.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
    }
  }

  if (dists.length === 0) {
    return { mean: 0, sd: 0, pass: false };
  }

  const mean = dists.reduce((s, x) => s + x, 0) / dists.length;
  const sd = Math.sqrt(dists.reduce((s, x) => s + (x - mean) ** 2, 0) / dists.length);
  return {
    mean: +mean.toFixed(2),
    sd: +sd.toFixed(2),
    pass: mean < cutoffDistance
  };
}

export class BaseColorTest {
  /**
   * @param {UIRefs} ui References to DOM elements (safe if some are missing).
   * @param {Partial<typeof defaults>} config Optional test settings.
   * @param {{clock?: ()=>number, rendererFactory?: (canvas, dot, onSelect)=>any}} deps
   *   - clock:       defaults to performance.now (easy to mock in tests)
   *   - rendererFactory: creates the color wheel (defaults to WheelRenderer)
   */
  constructor(ui, config = {}, deps = {}) {
    if (new.target === BaseColorTest) {
      throw new TypeError("BaseColorTest is abstract; extend and implement getStimuliSet/getTitle.");
    }

    // ---- Store collaborators & settings
    this.ui = ui || /** @type {UIRefs} */ ({});
    this.cfg = Object.freeze({ ...defaults, ...config });
    this.clock = deps.clock || (() => performance.now());
    this.rendererFactory = deps.rendererFactory || ((c, d, cb) => new WheelRenderer(c, d, cb));

    // ---- State we maintain
    this.trials = [];
    this.index = 0;         // which step in the deck we are on (0..total-1)
    this.current = {};      // info about the *current* step + selection
    this.isFrozen = false;  // wheel freeze toggle

    // ---- Build the deck from subclass data
    const items = requireNonEmptyArray("getStimuliSet()", this.getStimuliSet());
    this.deck = buildTrialDeck(items, this.cfg.trialsPerLabel);

    // ---- Prepare the wheel (if present)
    if (this.ui.wheel) {
      this.ui.wheel.width = this.ui.wheel.height = this.cfg.wheelSize;
      this.wheel = this.rendererFactory(this.ui.wheel, this.ui.dot, s => this._onColorSelect(s));
    }

    // ---- Wire UI and show the first screen
    this._wireCommonUI();
    this._loadStep();
  }

  // ====== ABSTRACTS (subclasses provide these) ======
  getStimuliSet() { throw new Error("getStimuliSet() must be implemented by subclass."); }
  getTitle()      { return "COLOR TEST"; }

  // ====== UI Wiring (buttons, keys, and dev slider) ======
  _wireCommonUI() {
    const ui = this.ui;

    // Help dialog (optional)
    if (ui.helpBtn && ui.helpDialog && ui.helpClose) {
      ui.helpBtn.addEventListener("click", () => ui.helpDialog.showModal());
      ui.helpClose.addEventListener("click", () => ui.helpDialog.close());
    }

    // Next: require either a color OR "no color" before moving on
    if (ui.btnNext) {
      ui.btnNext.addEventListener("click", () => {
        if (!this.current.hex && !this.current.none) return;
        this._saveTrial();
        this.index++;
        this.isFrozen = false;
        if (ui.dot) ui.dot.style.borderColor = "#000";

        if (this.index < this.deck.total) this._loadStep();
        else this._finish();
      });
    }

    // Toggle "No color" (button + 'N' key). This lets participants say:
    // “I don’t have a color for this item.”
    const toggleNone = () => {
      this.current.none = !this.current.none;
      if (this.current.none) {
        this.current.hex = null;
        this.current.rgb = null;
        this._setPreview(null);
      }
      if (ui.btnNext) ui.btnNext.disabled = !this.current.none && !this.current.hex;
    };
    if (ui.btnNone) ui.btnNone.addEventListener("click", toggleNone);
    window.addEventListener("keydown", (e) => {
      if (e.key?.toLowerCase() === "n") toggleNone();
    });

    // Dev slider: jump to a different trial block quickly
    if (ui.trialSlider) {
      ui.trialSlider.min = "1";
      ui.trialSlider.max = String(this.cfg.trialsPerLabel);
      ui.trialSlider.step = "1";
      ui.trialSlider.value = "1";
      ui.trialSlider.addEventListener("input", () => {
        const t = parseInt(ui.trialSlider.value, 10);
        // Move the pointer to the start of that trial block
        this.index = (t - 1) * this.deck.itemsPerTrial;
        this.isFrozen = false;
        this._loadStep();
      });
    }
  }

  // ====== Small helpers to keep the render logic readable ======
  _currentTrialNumber()       { return Math.floor(this.index / this.deck.itemsPerTrial) + 1; }
  _progressWithinTrial()      { return this.index % this.deck.itemsPerTrial; }

  _onColorSelect(s) {
    if (this.isFrozen) return;
    this.current.rgb = { r: s.r, g: s.g, b: s.b };
    this.current.hex = s.hex;
    this.current.none = false;
    this._setPreview(s.hex);
    if (this.ui.btnNext) this.ui.btnNext.disabled = false;
  }

  _setPreview(hex) {
    if (!this.ui.swatch || !this.ui.hex) return;
    if (!hex) {
      this.ui.swatch.style.background = "#e3e6ee";
      this.ui.hex.textContent = "———";
    } else {
      this.ui.swatch.style.background = `#${hex}`;
      this.ui.hex.textContent = hex;
    }
  }

  // Load a single step from the deck onto the screen
  _loadStep() {
    // Safety: never read past the deck (can happen if user slides too far)
    const safeIndex = Math.min(Math.max(this.index, 0), this.deck.total - 1);
    const step = this.deck.order[safeIndex];

    this.current = { ...step, rgb: null, hex: null, none: false };
    this.isFrozen = false;

    const trialNum = this._currentTrialNumber();
    const doneInTrial = this._progressWithinTrial();

    if (this.ui.stimulusContent) this.ui.stimulusContent.textContent = step.label;
    if (this.ui.stimulusLabel)   this.ui.stimulusLabel.textContent = step.label;
    if (this.ui.trialNum)        this.ui.trialNum.textContent = String(trialNum);
    if (this.ui.trialTotal)      this.ui.trialTotal.textContent = String(this.cfg.trialsPerLabel);
    if (this.ui.progress)        this.ui.progress.textContent = `${doneInTrial}/${this.deck.itemsPerTrial}`;

    this._setPreview(null);
    if (this.ui.btnNext) this.ui.btnNext.disabled = true;
    if (this.ui.dot) {
      this.ui.dot.style.display = "none";
      this.ui.dot.style.borderColor = "#000";
    }
    if (this.ui.trialSlider) this.ui.trialSlider.value = String(trialNum);

    this.startMs = this.clock();
  }

  _saveTrial() {
    const step = this.deck.order[this.index];
    const rt = Math.round(this.clock() - this.startMs);
    this.trials.push({
      stimulus_id: step.stimulus_id,
      label: step.label,
      trial_index: step.trial_index,
      rgb: this.current.rgb,
      hex: this.current.hex,
      none: !!this.current.none,
      rt_ms: rt
    });
  }

  _finish() {
    const { mean, sd, pass } = computeConsistencyMetrics(this.trials, this.cfg.cutoffDistance);

    if (!this.ui.cctSummary) return;
    this.ui.cctSummary.classList.remove("hidden");
    this.ui.cctSummary.innerHTML = `
      <div><b>${this.getTitle()} Results</b></div>
      <div>Mean distance: <b>${mean}</b></div>
      <div>Std deviation: <b>${sd}</b></div>
      <div>Outcome: <b>${pass ? "PASS" : "FAIL"}</b></div>
    `;

    // Optional: page code can listen for this to save to DB.
    // this.ui.cctSummary.dispatchEvent(new CustomEvent("cct:finished", { detail: { trials: this.trials, mean, sd, pass }}));
  }

  /** Call this if you dynamically remove the test from the page. */
  destroy() {
    // In this simple version, event listeners were attached directly and
    // we rely on the page being torn down. If you add global listeners,
    // unbind them here.
  }
}

export default BaseColorTest;
