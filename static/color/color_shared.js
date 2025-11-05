// ============================================================
// SYNTEST — Shared Utilities + WheelRenderer
// ------------------------------------------------------------
// Purpose (SOLID):
// - This module has a single responsibility: provide small pure helpers
//   and a minimal WheelRenderer that draws an HSL wheel, samples colors,
//   and notifies the page via a callback. No business logic, timers,
//   or persistence live here.
// - Open for extension / closed for modification: pages can wrap or
//   compose WheelRenderer behavior externally without editing this file.
// - Liskov, Interface Segregation, Dependency Inversion: the renderer
//   depends only on a standard <canvas> and a tiny callback interface;
//   the page decides what to do with selections (e.g., enable buttons,
//   save trials).
//
// ============================================================

/**
 * Clamp a number into a closed interval.
 * @param {number} v - value
 * @param {number} min - lower bound
 * @param {number} max - upper bound
 * @returns {number}
 */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Convert RGB components (0..255) to an uppercase hex string "RRGGBB".
 * Pure utility with no side effects.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
export const rgbToHex = (r, g, b) =>
  [r, g, b].map(n => clamp(n, 0, 255).toString(16).padStart(2, "0"))
           .join("")
           .toUpperCase();

/**
 * In-place Fisher–Yates shuffle. Returns the same array for convenience.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export const shuffle = arr => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * WheelRenderer
 * ------------------------------------------------------------
 * Minimal canvas-based color picker that:
 *  - draws an HSL wheel (H on X, L on Y, fixed S),
 *  - samples a color at a pointer position,
 *  - shows a movable "dot" marker,
 *  - toggles a "frozen" (locked) state on click (dot border turns red),
 *  - calls `onSelect({r,g,b,hex})` on drag/move selections and after unfreeze.
 *
 * The renderer does not manage higher-level UI (buttons, progress, etc.).
 * The host page wires `onSelect` to its own logic.
 */
export class WheelRenderer {
  /**
   * @param {HTMLCanvasElement} canvas - target canvas (square) already sized
   * @param {HTMLElement} dot - absolutely-positioned marker element
   * @param {(sel:{r:number,g:number,b:number,hex:string})=>void} onSelect - selection callback
   */
  constructor(canvas, dot, onSelect) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;
    /** @type {CanvasRenderingContext2D} */
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    /** @type {HTMLElement} */
    this.dot = dot;
    /** @type {function} */
    this.onSelect = onSelect;

    // Logical drawing size (CSS pixels) equals the canvas width attribute.
    // (HiDPI scaling is intentionally unchanged to preserve existing behavior.)
    this.size = canvas.width;

    // Pointer & lock state
    this.isDragging = false;
    this.isFrozen = false;

    // Render once and bind events
    this._draw();
    this._drawOutline();
    this._wireEvents();
  }

  /**
   * Draw the HSL wheel (H on X, L on Y, S fixed at 1.0).
   * No side effects beyond the canvas pixels.
   * @private
   */
  _draw() {
    const { ctx, size } = this;
    const img = ctx.createImageData(size, size);
    const data = img.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const h = (x / size) * 360; // hue axis
        const l = 1 - y / size;     // lightness axis
        const s = 1.0;              // saturation fixed
        const [r, g, b] = this._hslToRgb(h, s, l);
        data[idx]     = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  /**
   * Draw a crisp 1px border around the wheel.
   * @private
   */
  _drawOutline() {
    const { ctx, size } = this;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }

  /**
   * Convert HSL to RGB (0..255 each). Pure function.
   * @param {number} h - 0..360
   * @param {number} s - 0..1
   * @param {number} l - 0..1
   * @returns {[number,number,number]}
   * @private
   */
  _hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h < 60)      [r, g, b] = [c, x, 0];
    else if (h < 120)[r, g, b] = [x, c, 0];
    else if (h < 180)[r, g, b] = [0, c, x];
    else if (h < 240)[r, g, b] = [0, x, c];
    else if (h < 300)[r, g, b] = [x, 0, c];
    else             [r, g, b] = [c, 0, x];

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }

  /**
   * Bind mouse events for drag-to-preview and click-to-freeze/unfreeze.
   * Behavior is intentionally unchanged.
   * @private
   */
  _wireEvents() {
    // Start dragging and emit a selection under the pointer.
    this.canvas.addEventListener("mousedown", e => {
      if (this.isFrozen) return;
      this.isDragging = true;
      const s = this._sampleAtEvent(e);
      if (s) this.onSelect?.(s);
    });

    // While dragging, keep emitting selections.
    this.canvas.addEventListener("mousemove", e => {
      if (!this.isDragging || this.isFrozen) return;
      const s = this._sampleAtEvent(e);
      if (s) this.onSelect?.(s);
    });

    // Stop dragging when mouse is released anywhere.
    window.addEventListener("mouseup", () => { this.isDragging = false; });

    // Click toggles freeze:
    //  - On first click, lock and turn dot border red (no new selection emitted).
    //  - On next click, unlock (turn border black) and emit a selection at click.
    this.canvas.addEventListener("click", e => {
      const s = this._sampleAtEvent(e);
      if (!s) return;

      if (!this.isFrozen) {
        this.isFrozen = true;
        this.isDragging = false;
        this.dot.style.borderColor = "#f00"; // frozen indicator (red)
      } else {
        this.isFrozen = false;
        this.dot.style.borderColor = "#000"; // live indicator (black)
        this.onSelect?.(s);                  // re-emit after unfreezing
      }
    });
  }

  /**
   * Sample the color at a mouse event, position the dot, and return RGB+hex.
   * Returns null if outside canvas bounds. No state is mutated aside from
   * dot visibility/position (view concern).
   * @param {MouseEvent} e
   * @returns {{r:number,g:number,b:number,hex:string}|null}
   * @private
   */
  _sampleAtEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;

    const p = this.ctx.getImageData(x, y, 1, 1).data;

    // Update marker position/visibility (presentation only).
    this.dot.style.display = "block";
    this.dot.style.left = `${x - 7}px`;
    this.dot.style.top  = `${y - 7}px`;

    return { r: p[0], g: p[1], b: p[2], hex: rgbToHex(p[0], p[1], p[2]) };
  }
}
