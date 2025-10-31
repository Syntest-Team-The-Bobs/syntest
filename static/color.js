/* ===========================================================
   SYNTEST — Color Test (CCT-only, no API)
   Description:
   Implements a self-contained version of the Color-to-Concept Test (CCT),
   designed for local testing without backend dependencies.

   Features:
   - Square hue–lightness field (S=1.0) rendered on canvas.
   - Click or drag to select a color; click again to freeze/unfreeze.
   - 3 trial blocks: A–Z, 0–9, and fixed word stimuli (full deck).
   - Enforces color selection before advancing.
   - Stores responses locally and computes summary metrics.

   =========================================================== */

(() => {
  /* ------------------ Config ------------------
     Global constants controlling structure and parameters.
  ------------------------------------------------------------ */
  const CONFIG = Object.freeze({
    trialsPerLabel: 3,      // number of blocks (each item appears once per block)
    wheelSize: 360,         // canvas size in pixels (square)
    cutoffDistance: 135     // distance threshold for "PASS" outcome (RGB space)
  });

  /* ------------------ Utility Functions ------------------
     Helper methods used throughout script for basic operations.
  ------------------------------------------------------------ */

  // Restrict a value within a numeric range
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Convert RGB components (0–255) into uppercase 6-digit HEX
  const rgbToHex = (r, g, b) =>
    [r, g, b].map(n => clamp(n, 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();

  // Query selector shortcut
  const el = sel => document.querySelector(sel);

  // Fisher–Yates shuffle (used for randomizing each trial block)
  const shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  /* ------------------ Trial Deck Construction ------------------
     Builds all trials client-side with no backend calls.
     Each block (trialIndex) is a shuffled full set of stimuli.
  --------------------------------------------------------------- */
  const WORDS = [
    "RED", "BLUE", "GREEN", "SUN", "MOON", "STAR", "DAY", "NIGHT",
    "CAT", "DOG", "APPLE", "MONDAY", "MUSIC", "WATER", "SALT"
  ];

  function buildLocalTrialsAsBlocks() {
    // Letters A–Z and digits 0–9
    const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    const digits  = Array.from({ length: 10 }, (_, i) => String(i));
    const items = [...letters, ...digits, ...WORDS]; // total = 51 items

    // Create a stable ID map (label → numeric ID)
    const idMap = new Map(items.map((label, i) => [label, i + 1]));

    const blocks = [];
    for (let t = 1; t <= CONFIG.trialsPerLabel; t++) {
      const blockOrder = shuffle([...items]); // shuffle per block
      for (const label of blockOrder) {
        blocks.push({
          stimulus_id: idMap.get(label),
          label,
          trial_index: t // which block this belongs to (1..3)
        });
      }
    }

    return { order: blocks, itemsPerTrial: items.length }; // {153 total, 51 per block}
  }

  /* ===========================================================
     WheelRenderer
     Renders the interactive hue–lightness square and manages
     mouse interaction for color selection.
     =========================================================== */
  class WheelRenderer {
    constructor(canvas, dot, onSelect) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { willReadFrequently: true });
      this.dot = dot;
      this.size = canvas.width;
      this.onSelect = onSelect;
      this.isDragging = false;
      this.isFrozen = false;

      this._draw();          // initial H–L map render
      this._drawOutline();   // border
      this._wireEvents();    // mouse listeners
    }

    // Render full hue–lightness grid (saturation fixed at 1)
    _draw() {
      const { ctx, size } = this;
      const img = ctx.createImageData(size, size);
      const data = img.data;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const h = (x / size) * 360; // horizontal → hue
          const l = 1 - y / size;     // vertical → lightness
          const s = 1.0;
          const [r, g, b] = this._hslToRgb(h, s, l);
          data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    // Draw a black border around the wheel
    _drawOutline() {
      const { ctx, size } = this;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#000";
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
    }

    // Convert HSL color to RGB (0–255)
    _hslToRgb(h, s, l) {
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = l - c / 2;
      let r = 0, g = 0, b = 0;
      if (h < 60) [r, g, b] = [c, x, 0];
      else if (h < 120) [r, g, b] = [x, c, 0];
      else if (h < 180) [r, g, b] = [0, c, x];
      else if (h < 240) [r, g, b] = [0, x, c];
      else if (h < 300) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
      ];
    }

    // Set up mouse interactions (drag, click, freeze toggle)
    _wireEvents() {
      // Click-drag sampling
      this.canvas.addEventListener("mousedown", e => {
        if (this.isFrozen) return;
        this.isDragging = true;
        const s = this.sampleAt(e.clientX, e.clientY);
        if (s && this.onSelect) this.onSelect(s);
      });

      this.canvas.addEventListener("mousemove", e => {
        if (!this.isDragging || this.isFrozen) return;
        const s = this.sampleAt(e.clientX, e.clientY);
        if (s && this.onSelect) this.onSelect(s);
      });

      window.addEventListener("mouseup", () => { this.isDragging = false; });

      // Toggle frozen state on click
      this.canvas.addEventListener("click", e => {
        const s = this.sampleAt(e.clientX, e.clientY);
        if (!s) return;
        if (!this.isFrozen) {
          this.isFrozen = true;
          this.isDragging = false;
          this.dot.style.borderColor = "#f00"; // red ring when frozen
        } else {
          this.isFrozen = false;
          this.dot.style.borderColor = "#000"; // back to black
          if (s && this.onSelect) this.onSelect(s);
        }
      });
    }

    // Sample RGB color at a given client coordinate
    sampleAt(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor(clientX - rect.left);
      const y = Math.floor(clientY - rect.top);
      if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;

      const pixel = this.ctx.getImageData(x, y, 1, 1).data;
      this.dot.style.display = "block";
      this.dot.style.left = `${x - 7}px`;
      this.dot.style.top  = `${y - 7}px`;

      return {
        r: pixel[0],
        g: pixel[1],
        b: pixel[2],
        hex: rgbToHex(pixel[0], pixel[1], pixel[2])
      };
    }
  }

  /* ===========================================================
     CctController
     Coordinates trial flow, user input, data recording, and
     summary computation. Handles all UI wiring and logic.
     =========================================================== */
  class CctController {
    constructor(ui, wheel) {
      this.ui = ui;
      this.wheel = wheel;
      this.index = 0;       // current index (0..totalTrials-1)
      this.trials = [];     // stored results
      this.current = {};    // active trial data
      this.isFrozen = false;

      // Build randomized deck
      const deck = buildLocalTrialsAsBlocks();
      this.order = deck.order;
      this.itemsPerTrial = deck.itemsPerTrial;
      this.total = this.order.length;

      // Interactive trial slider setup (for manual navigation)
      if (this.ui.trialSlider) {
        this.ui.trialSlider.min = "1";
        this.ui.trialSlider.max = String(CONFIG.trialsPerLabel);
        this.ui.trialSlider.step = "1";
        this.ui.trialSlider.value = "1";
        this.ui.trialSlider.disabled = false;
        this.ui.trialSlider.addEventListener("input", () => {
          const t = parseInt(this.ui.trialSlider.value, 10);
          this.index = (t - 1) * this.itemsPerTrial;
          this.isFrozen = false;
          this._loadStep();
        });
      }

      this._wireUI();
      this._loadStep();
    }

    // Return current trial block (1..3)
    _currentTrialNumber() {
      return Math.floor(this.index / this.itemsPerTrial) + 1;
    }

    // Position within the current block (0-based)
    _progressWithinTrial() {
      return this.index % this.itemsPerTrial;
    }

    // Bind UI buttons and wheel callbacks
    _wireUI() {
      const updateNext = () => {
        this.ui.btnNext.disabled = !this.current.hex; // disable until color chosen
      };

      // Optional reset: clears current selection
      this.ui.btnReset && (this.ui.btnReset.onclick = () => {
        this.current = { ...this.current, rgb: null, hex: null };
        this._setPreview(null);
        this.ui.dot.style.display = "none";
        this.ui.dot.style.borderColor = "#000";
        this.isFrozen = false;
        updateNext();
      });

      // Optional back: step back one trial
      this.ui.btnBack && (this.ui.btnBack.onclick = () => {
        if (this.index === 0) return;
        this.index--;
        this.trials.pop();
        this.isFrozen = false;
        this._loadStep();
      });

      // Next: save response and advance
      this.ui.btnNext.onclick = () => {
        if (!this.current.hex) return;
        this._saveTrial();
        this.index++;
        this.isFrozen = false;
        this.ui.dot.style.borderColor = "#000";

        const trialNum = this._currentTrialNumber();
        if (this.ui.trialSlider) {
          this.ui.trialSlider.value = String(Math.min(trialNum, CONFIG.trialsPerLabel));
        }

        if (this.index < this.total) this._loadStep();
        else this._finish();
      };

      // Wheel live updates when not frozen
      this.wheel.onSelect = s => {
        if (!this.isFrozen) {
          this.current.rgb = { r: s.r, g: s.g, b: s.b };
          this.current.hex = s.hex;
          this._setPreview(s.hex);
          this.ui.btnNext.disabled = false;
        }
      };
    }

    // Update color preview box
    _setPreview(hex) {
      if (!hex) {
        this.ui.swatch.style.background = "#e3e6ee";
        this.ui.hex.textContent = "———";
      } else {
        this.ui.swatch.style.background = `#${hex}`;
        this.ui.hex.textContent = hex;
      }
    }

    // Load current trial item (label/stimulus)
    _loadStep() {
      const step = this.order[this.index];
      this.current = { ...step, rgb: null, hex: null };
      this.isFrozen = false;

      const trialNum = this._currentTrialNumber();
      const doneInTrial = this._progressWithinTrial();

      // Update text fields and progress indicators
      this.ui.stim.textContent = step.label;
      this.ui.trialNum.textContent = trialNum;
      this.ui.trialTotal.textContent = CONFIG.trialsPerLabel;
      this.ui.progress.textContent = `${doneInTrial}/${this.itemsPerTrial}`;

      // Stimulus box appearance (word vs. grapheme)
      const isWord = WORDS.includes(step.label);
      this.ui.stimulusBox?.setAttribute("data-type", isWord ? "word" : "grapheme");
      if (this.ui.stimulusContent) this.ui.stimulusContent.textContent = step.label;

      // Reset visual state
      this._setPreview(null);
      this.ui.dot.style.display = "none";
      this.ui.dot.style.borderColor = "#000";
      if (this.ui.btnBack) this.ui.btnBack.disabled = this.index === 0;
      this.ui.btnNext.disabled = true;

      // Keep slider synced
      if (this.ui.trialSlider) this.ui.trialSlider.value = String(trialNum);

      this.startMs = performance.now();
    }

    // Save one trial’s data (stimulus + chosen color + RT)
    _saveTrial() {
      const step = this.order[this.index];
      const rt = Math.round(performance.now() - this.startMs);
      this.trials.push({
        stimulus_id: step.stimulus_id,
        label: step.label,
        trial_index: this._currentTrialNumber(),
        rgb: this.current.rgb,
        hex: this.current.hex,
        rt_ms: rt
      });
    }

    // Compute color consistency summary (Euclidean RGB distances)
    _finish() {
      const byLabel = new Map();
      for (const t of this.trials) {
        if (!t.rgb) continue;
        if (!byLabel.has(t.label)) byLabel.set(t.label, []);
        byLabel.get(t.label).push([t.rgb.r, t.rgb.g, t.rgb.b]);
      }

      // Compute pairwise RGB distances for each label
      const all = [];
      for (const [, cols] of byLabel) {
        for (let i = 0; i < cols.length; i++) {
          for (let j = i + 1; j < cols.length; j++) {
            const a = cols[i], b = cols[j];
            all.push(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
          }
        }
      }

      const mean = all.length ? +(all.reduce((s, x) => s + x, 0) / all.length).toFixed(2) : 0;
      const sd   = all.length ? +Math.sqrt(all.reduce((s, x) => s + (x - mean) ** 2, 0) / all.length).toFixed(2) : 0;
      const pass = mean < CONFIG.cutoffDistance;

      this.ui.cctSummary.classList.remove("hidden");
      this.ui.cctSummary.innerHTML = `
        <div><b>CCT Results</b></div>
        <div>Mean distance: <b>${mean}</b></div>
        <div>Std deviation: <b>${sd}</b></div>
        <div>Outcome: <b>${pass ? "PASS" : "FAIL"}</b></div>`;
    }
  }

  /* ===========================================================
     Bootstrap (Entry Point)
     Initialize DOM references, renderer, and controller.
     =========================================================== */
  const ui = {
    wheel: el("#wheel"),
    dot: el("#dot"),
    swatch: el("#swatch"),
    hex: el("#hex"),
    stim: el("#stimulusLabel"),
    trialNum: el("#trialNum"),
    trialTotal: el("#trialTotal"),
    progress: el("#progress"),
    btnReset: el("#btnReset"),
    btnBack: el("#btnBack"),
    btnNext: el("#btnNext"),
    cctSummary: el("#cctSummary"),
    stimulusBox: el("#stimulusBox"),
    stimulusContent: el("#stimulusContent"),
    trialSlider: el("#trialSlider"),
  };

  // Initialize renderer
  const wheelCanvas = ui.wheel;
  wheelCanvas.width = wheelCanvas.height = CONFIG.wheelSize;

  let cct;
  const wheel = new WheelRenderer(wheelCanvas, ui.dot, s => {
    if (!cct) return;
    if (!cct.isFrozen) {
      cct.current.rgb = { r: s.r, g: s.g, b: s.b };
      cct.current.hex = s.hex;
      cct._setPreview(s.hex);
      ui.btnNext.disabled = false;
    }
  });

  // Start controller
  cct = new CctController(ui, wheel);
})();

// ===== Color Test API Helpers (non-invasive) =====
async function apiGetColorStimuli(setId = null) {
  const url = setId ? `/api/color/stimuli?set_id=${encodeURIComponent(setId)}` : `/api/color/stimuli`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load color stimuli: ${res.status}`);
  return await res.json(); // [{id,set_id,description,owner_researcher_id,family,r,g,b,hex,trigger_type}, ...]
}

async function apiPostColorTrials(trials) {
  // trials can be one object or an array of objects
  const body = Array.isArray(trials) ? trials : [trials];
  const res = await fetch(`/api/color/trials`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to save trials: ${res.status}`);
  return await res.json(); // { saved, ids: [...] }
}

// Optional: quick seed helper you can call from console once.
async function apiSeedColor() {
  const res = await fetch(`/api/color/seed`, { method: "POST" });
  if (!res.ok) throw new Error(`Seed failed: ${res.status}`);
  return await res.json();
}

// Make available to existing code or console usage
window.ColorAPI = { apiGetColorStimuli, apiPostColorTrials, apiSeedColor };
