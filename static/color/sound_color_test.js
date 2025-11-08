// ============================================================
// SYNTEST — Sound → Color Test (DEBUG-INSTRUMENTED)
// ============================================================

import BaseColorTest from "./base_color_test.js";

const DEBUG = true; // flip to false to silence logs
const log = (...a) => { if (DEBUG) console.log("[SND]", ...a); };
const warn = (...a) => { if (DEBUG) console.warn("[SND]", ...a); };
const err  = (...a) => { if (DEBUG) console.error("[SND]", ...a); };

// Helpful global trap
window.addEventListener("error", (e) => err("window.error:", e.message, e.filename, e.lineno));
window.addEventListener("unhandledrejection", (e) => err("unhandledrejection:", e.reason));

const HZ = Object.freeze({
  C1: 32.703, G1: 49.000, D2: 73.416, A2: 110.000, E3: 164.814,
  B3: 246.942, "F#4": 369.994, "Db5": 554.365, "Ab5": 830.609,
  "Eb6": 1244.508, "Bb6": 1864.655, C4_262: 262.000,
});

// Pick waveforms that are audible on laptop speakers
const INSTR_OSC = Object.freeze({
  piano:  "square",
  sine:   "sine",
  string: "sawtooth",
});

function buildStimuli() {
  const base = ["C1","G1","D2","A2","E3","B3","F#4","Db5","Ab5","Eb6"];
  const inst = ["piano","sine","string"];
  const out = [];
  for (const p of base) for (const i of inst)
    out.push({ key:`${p} – ${i}`, kind:"single", f:HZ[p], osc:INSTR_OSC[i] });

  const varied = ["piano","sine","string","piano","sine","string","piano","sine","string","piano"];
  for (let k=0;k<10;k++)
    out.push({ key:`~262 Hz – ${varied[k]}`, kind:"single", f:HZ.C4_262, osc:INSTR_OSC[varied[k]] });

  const pairs = [
    ["C1","G1"],["G1","D2"],["D2","A2"],["A2","E3"],["E3","B3"],
    ["B3","F#4"],["F#4","Db5"],["Db5","Ab5"],["Ab5","Eb6"],["Eb6","Bb6"]
  ];
  for (const [a,b] of pairs) for (const i of inst)
    out.push({ key:`${a}+${b} – ${i}`, kind:"dyad", f:[HZ[a],HZ[b]], osc:INSTR_OSC[i] });

  return out;
}
const STIMULI = buildStimuli();

export class SoundColorTest extends BaseColorTest {
  getStimuliSet() {
    this._stimByKey = new Map(STIMULI.map(s => [s.key, s]));
    return STIMULI.map(s => s.key);
  }
  getTitle() { return "SOUND–COLOR"; }

  constructor(ui, cfg = {}) {
    log("ctor: init with cfg", cfg);
    super(ui, cfg);

    // Lazy AudioContext (created on first play)
    this.ac = null;
    this.masterGain = null;

    this.playedThisStep = false;
    this.activeNodes = [];

    // Whole stimulus box is the play button
    this.playBtn = ui.playTone || ui.stimulusBox || ui.stimulusContent;
    if (this.playBtn) {
      this.playBtn.addEventListener("click", () => this._playCurrent());
      log("play target wired:", this.playBtn.id || this.playBtn.tagName);
    } else {
      warn("No play target found in UI (playTone/stimulusBox/stimulusContent)");
    }

    // Spacebar = replay
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") { e.preventDefault(); this._playCurrent(); }
    });
  }

  _loadStep() {
    super._loadStep();
    this._stopAll();
    this.playedThisStep = false;

    const step = this.deck.order[this.index];
    const meta = this._stimByKey.get(step.label);
    if (this.ui.stimulusContent) this.ui.stimulusContent.textContent = meta ? meta.key : "—";
    log("loadStep:", { index: this.index, label: step.label, meta });

    this._recheckNext();
  }

  _onColorSelect(s) {
    log("colorSelect:", s);
    super._onColorSelect(s);
    this._recheckNext();
  }

  _recheckNext() {
    if (!this.ui.btnNext) return;
    const enabled = !!this.current.hex && this.playedThisStep;
    this.ui.btnNext.disabled = !enabled;
    log("recheckNext:", { hexChosen: !!this.current.hex, playedThisStep: this.playedThisStep, enableNext: enabled });
  }

  async _ensureAudio() {
    if (!this.ac) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      try {
        this.ac = new Ctx();
        this.masterGain = this.ac.createGain();
        this.masterGain.gain.value = 0.25;
        this.masterGain.connect(this.ac.destination);
        log("AudioContext created:", { sampleRate: this.ac.sampleRate, state: this.ac.state });
      } catch (e) {
        err("Failed to create AudioContext:", e);
        return false;
      }
    }
    if (this.ac.state !== "running") {
      try {
        await this.ac.resume();
        log("AudioContext resumed:", this.ac.state);
      } catch (e) {
        err("resume() failed:", e);
        return false;
      }
    }
    return true;
  }

  async _playCurrent() {
    log("playCurrent: clicked");
    if (!(await this._ensureAudio())) {
      warn("Audio not available; cannot play");
      this.playedThisStep = true; // still allow Next to test the path
      this._recheckNext();
      return;
    }

    this._stopAll();

    const step = this.deck.order[this.index];
    const meta = this._stimByKey.get(step.label);
    if (!meta) { warn("no meta for step:", step); return; }

    const now = this.ac.currentTime;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(1.0, now + 0.02);
    g.connect(this.masterGain);

    const DUR = 3.0;
    const stopAt = now + DUR;
    const nodes = [];

    const makeOsc = (freq, type = meta.osc, dest = g) => {
      const o = this.ac.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, now);
      o.connect(dest);
      o.start(now);
      o.stop(stopAt);
      o.onended = () => { try { o.disconnect(); } catch {} };
      return o;
    };

    const addAudibleTone = (f) => {
      // base tone
      nodes.push(makeOsc(f));
      // helpers for laptop audibility
      if (f < 150) {
        const g2 = this.ac.createGain(); g2.gain.setValueAtTime(0.6, now); g2.connect(g);
        nodes.push(makeOsc(f * 2, meta.osc, g2), g2);
      }
      if (f < 80) {
        const g4 = this.ac.createGain(); g4.gain.setValueAtTime(0.3, now); g4.connect(g);
        nodes.push(makeOsc(f * 4, "square", g4), g4);
      }
      log("addAudibleTone:", { baseHz: f });
    };

    if (meta.kind === "dyad") {
      const [f1, f2] = meta.f;
      log("DYAD play:", meta.key, f1, f2, "wave:", meta.osc);
      addAudibleTone(f1); addAudibleTone(f2);
    } else {
      log("SINGLE play:", meta.key, meta.f, "wave:", meta.osc);
      addAudibleTone(meta.f);
    }

    g.gain.setTargetAtTime(0.0001, stopAt - 0.08, 0.06);

    this.activeNodes = [...nodes, g];
    this.playedThisStep = true;
    this._recheckNext();
  }

  _stopAll() {
    if (!this.activeNodes?.length) return;
    log("stopAll: stopping", this.activeNodes.length, "nodes");
    for (const n of this.activeNodes) {
      try { n.stop?.(); } catch {}
      try { n.disconnect?.(); } catch {}
    }
    this.activeNodes = [];
  }

  destroy() {
    log("destroy()");
    this._stopAll();
    try { this.masterGain?.disconnect(); } catch {}
    try { this.ac?.close(); } catch {}
    super.destroy?.();
  }
}

export default SoundColorTest;