// Renderer-independent page-flip physics. Used by the CSS book reader (the
// WebGL/three.js mesh from the spec cannot run in the Figma Make runtime, so the
// physics MODEL lives here and drives the DOM transforms instead of shaders).

export type FlipDirection = 'next' | 'prev';

export const SNAP_THRESHOLD = 0.35; // release >= this → complete, else snap back
export const SCROLL_DISTANCE = 300; // px of horizontal scroll for a full flip
export const SCROLL_IDLE_MS = 100; // no wheel events for this long → "release"
export const OVERSCROLL_MAX = 0.08; // boundary bounce ceiling

/**
 * Non-linear input→progress mapping so a drag/scroll FEELS like real paper:
 * high resistance while the page is "stuck" to the stack, free movement in the
 * middle, then gravity-assisted ease-out near the end.
 *
 * raw = fraction of page width dragged (0..1+). Returns progress 0..1.
 *  - raw 0.0–0.4  → progress 0.00–0.15  (easeIn cubic — stuck)
 *  - raw 0.4–0.8  → progress 0.15–0.60  (linear — free)
 *  - raw 0.8–1.0+ → progress 0.60–1.00  (easeOut — gravity assists)
 */
export function resistanceCurve(raw: number): number {
  const r = Math.max(0, raw);
  if (r < 0.4) {
    const t = r / 0.4;
    return 0.15 * t * t * t;
  }
  if (r < 0.8) {
    const t = (r - 0.4) / 0.4;
    return 0.15 + 0.45 * t;
  }
  const t = Math.min(1, (r - 0.8) / 0.2);
  return 0.6 + 0.4 * (1 - Math.pow(1 - t, 2));
}

/**
 * Backward flips feel lighter/gentler than forward flips. This scales the
 * visual curl (skew) per direction so the two are visibly distinct, per the spec
 * ("forward folds away / backward unfolds toward you, wider radius").
 */
export function curlSkew(direction: FlipDirection, flipAngleDeg: number): number {
  const base = Math.sin((flipAngleDeg * Math.PI) / 180);
  // Forward: tighter curl (more skew). Backward: wider radius → gentler skew,
  // and curls the other way (negative).
  return direction === 'next' ? base * 4.2 : base * -2.6;
}

interface SpringOpts {
  stiffness: number;
  damping: number;
  mass?: number;
}

/** Critically-ish damped spring integrator (semi-implicit Euler). */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  private stiffness: number;
  private damping: number;
  private mass: number;

  constructor(initial: number, opts: SpringOpts) {
    this.value = initial;
    this.target = initial;
    this.stiffness = opts.stiffness;
    this.damping = opts.damping;
    this.mass = opts.mass ?? 1;
  }

  setTarget(target: number) {
    this.target = target;
  }

  /** Advance by dt seconds. Returns true once settled at the target. */
  update(dt: number): boolean {
    // Clamp dt so a long frame (tab refocus) can't explode the integrator.
    const step = Math.min(dt, 1 / 30);
    const force = -this.stiffness * (this.value - this.target);
    const damp = -this.damping * this.velocity;
    const accel = (force + damp) / this.mass;
    this.velocity += accel * step;
    this.value += this.velocity * step;

    const settled =
      Math.abs(this.value - this.target) < 0.001 && Math.abs(this.velocity) < 0.01;
    if (settled) {
      this.value = this.target;
      this.velocity = 0;
    }
    return settled;
  }
}

// Direction-aware spring presets (from the spec). Backward auto-complete is a
// touch softer (the "return" gesture feels lighter); snap-back is snappier.
export function springPreset(
  kind: 'complete' | 'snapback',
  direction: FlipDirection,
): SpringOpts {
  if (kind === 'snapback') {
    return { stiffness: 250, damping: 25 };
  }
  // complete
  return direction === 'next'
    ? { stiffness: 180, damping: 22 }
    : { stiffness: 165, damping: 24 };
}
