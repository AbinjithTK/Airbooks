import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';

/* ─── Types ─── */
export interface HandState {
  isPresent: boolean;
  isPointing: boolean;
  isPinch: boolean;
  isOpenHand: boolean;
  isFist: boolean;
  cursorX: number;        // normalized 0-1
  cursorY: number;        // normalized 0-1
  screenX: number;        // px
  screenY: number;        // px
  swipe: 'left' | 'right' | null;
  isSwiping: boolean;
  swipeDelta: number;     // -1 to 1
  /** Fist held duration in ms — for magic gesture detection */
  fistHeldMs: number;
  /** Magic summon gesture detected (fist 1.5s → open hand) */
  magicSummon: boolean;
}

export type TrackingMode = 'camera' | 'mouse';

interface HandTrackingContextType {
  hand: HandState;
  isActive: boolean;
  mode: TrackingMode;
  toggleTracking: () => void;
  gestureLog: string | null;
}

const defaultHand: HandState = {
  isPresent: false,
  isPointing: false,
  isPinch: false,
  isOpenHand: false,
  isFist: false,
  cursorX: 0.5,
  cursorY: 0.5,
  screenX: 0,
  screenY: 0,
  swipe: null,
  isSwiping: false,
  swipeDelta: 0,
  fistHeldMs: 0,
  magicSummon: false,
};

const HandTrackingContext = createContext<HandTrackingContextType>({
  hand: defaultHand,
  isActive: false,
  mode: 'mouse',
  toggleTracking: () => {},
  gestureLog: null,
});

export const useHandTracking = () => useContext(HandTrackingContext);

/* ═══════════════════════════════════════════════════
   Smoothing / jitter reduction utilities
   ═══════════════════════════════════════════════════ */

/** Exponential Moving Average smoother */
class EMASmoother {
  private x: number;
  private y: number;
  private initialized = false;
  constructor(private alpha: number = 0.35) {}

  update(rawX: number, rawY: number): { x: number; y: number } {
    if (!this.initialized) {
      this.x = rawX;
      this.y = rawY;
      this.initialized = true;
      return { x: rawX, y: rawY };
    }
    this.x += this.alpha * (rawX - this.x);
    this.y += this.alpha * (rawY - this.y);
    return { x: this.x, y: this.y };
  }

  reset() { this.initialized = false; }
}

/** Dead-zone filter: ignore tiny movements */
function applyDeadZone(
  prev: { x: number; y: number },
  next: { x: number; y: number },
  threshold: number,
): { x: number; y: number } {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < threshold) return prev;
  return next;
}

/* ─── Gesture helpers (camera) ─── */
function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isFingerExtended(
  tip: { x: number; y: number; z: number },
  pip: { x: number; y: number; z: number },
  mcp: { x: number; y: number; z: number },
) {
  return tip.y < pip.y && pip.y < mcp.y;
}

function detectGestures(landmarks: { x: number; y: number; z: number }[]) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const indexMcp = landmarks[5];
  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const middleMcp = landmarks[9];
  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const ringMcp = landmarks[13];
  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];
  const pinkyMcp = landmarks[17];

  const indexUp = isFingerExtended(indexTip, indexPip, indexMcp);
  const middleUp = isFingerExtended(middleTip, middlePip, middleMcp);
  const ringUp = isFingerExtended(ringTip, ringPip, ringMcp);
  const pinkyUp = isFingerExtended(pinkyTip, pinkyPip, pinkyMcp);

  const pinchDist = distance(thumbTip, indexTip);
  const isPinch = pinchDist < 0.05;
  const isPointing = indexUp && !middleUp && !ringUp && !pinkyUp && !isPinch;
  const isOpenHand = indexUp && middleUp && ringUp && pinkyUp;
  const isFist = !indexUp && !middleUp && !ringUp && !pinkyUp;

  return { isPinch, isPointing, isOpenHand, isFist };
}

/* ═══════════════════════════════════════════════════
   Swipe detector — deliberate, direction-aware
   ═══════════════════════════════════════════════════ */
class SwipeDetector {
  private startX: number | null = null;
  private startY: number | null = null;
  private samples: { x: number; y: number; t: number }[] = [];
  private locked = false;         // committed to swiping
  private directionLocked: 'h' | 'v' | null = null;

  // Thresholds (normalized 0-1 coords)
  private MIN_H_TRAVEL = 0.06;    // must move at least 6% of screen to start
  private H_V_RATIO = 2.0;        // must be 2x more horizontal than vertical
  private CENTER_ZONE_TOP = 0.15;  // swipe only from middle 70% of screen
  private CENTER_ZONE_BOT = 0.85;

  update(
    isOpen: boolean,
    cursorX: number,
    cursorY: number,
  ): { isSwiping: boolean; delta: number } {
    if (!isOpen) {
      this.reset();
      return { isSwiping: false, delta: 0 };
    }

    const now = performance.now();

    // Must be in center zone vertically to swipe
    if (cursorY < this.CENTER_ZONE_TOP || cursorY > this.CENTER_ZONE_BOT) {
      this.reset();
      return { isSwiping: false, delta: 0 };
    }

    if (this.startX === null) {
      this.startX = cursorX;
      this.startY = cursorY;
      this.samples = [{ x: cursorX, y: cursorY, t: now }];
      return { isSwiping: false, delta: 0 };
    }

    this.samples.push({ x: cursorX, y: cursorY, t: now });
    // Keep last 15 samples
    if (this.samples.length > 15) this.samples.shift();

    const dx = cursorX - this.startX;
    const dy = cursorY - this.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Direction lock: first significant movement decides if this is horizontal or vertical
    if (!this.directionLocked && (absDx > 0.03 || absDy > 0.03)) {
      this.directionLocked = absDx > absDy ? 'h' : 'v';
    }

    // If vertical movement, not a swipe
    if (this.directionLocked === 'v') {
      return { isSwiping: false, delta: 0 };
    }

    // Must travel minimum horizontal distance to be considered a swipe
    if (!this.locked) {
      if (absDx < this.MIN_H_TRAVEL) {
        return { isSwiping: false, delta: 0 };
      }
      // Check h/v ratio
      if (absDy > 0.01 && absDx / absDy < this.H_V_RATIO) {
        return { isSwiping: false, delta: 0 };
      }
      this.locked = true;
    }

    // Compute delta: ~0.35 of screen = full flip
    const delta = dx * 2.8;
    return {
      isSwiping: true,
      delta: Math.max(-1, Math.min(1, delta)),
    };
  }

  reset() {
    this.startX = null;
    this.startY = null;
    this.samples = [];
    this.locked = false;
    this.directionLocked = null;
  }
}

/* ═══════════════════════════════════════════════════
   Magic gesture detector (fist hold → open hand)
   ═══════════════════════════════════════════════════ */
class MagicGestureDetector {
  private fistStartTime: number | null = null;
  private triggered = false;
  private cooldown = false;

  /** Returns { fistHeldMs, magicSummon } */
  update(isFist: boolean, isOpenHand: boolean): { fistHeldMs: number; magicSummon: boolean } {
    const now = performance.now();

    if (isFist) {
      if (this.fistStartTime === null) this.fistStartTime = now;
      const held = now - this.fistStartTime;
      return { fistHeldMs: held, magicSummon: false };
    }

    if (isOpenHand && this.fistStartTime !== null && !this.cooldown) {
      const held = now - this.fistStartTime;
      if (held >= 1500) {
        // Magic! Fist held 1.5s then opened
        this.fistStartTime = null;
        this.cooldown = true;
        setTimeout(() => { this.cooldown = false; }, 3000);
        return { fistHeldMs: 0, magicSummon: true };
      }
    }

    this.fistStartTime = null;
    return { fistHeldMs: 0, magicSummon: false };
  }

  reset() {
    this.fistStartTime = null;
    this.triggered = false;
  }
}

/* ═══════════════════════════════════════════════════
   Provider
   ═══════════════════════════════════════════════════ */
export function HandTrackingProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TrackingMode>('mouse');
  const [hand, setHand] = useState<HandState>(defaultHand);
  const [gestureLog, setGestureLog] = useState<string | null>(null);

  const rafRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const toggleTracking = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  /* ── Main tracking effect ── */
  useEffect(() => {
    if (!isActive) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      setHand(defaultHand);
      return;
    }

    let cancelled = false;

    /* ────── Camera mode ────── */
    async function tryCamera(): Promise<boolean> {
      try {
        let probeStream: MediaStream;
        try {
          probeStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
          });
        } catch {
          return false;
        }
        if (cancelled) {
          probeStream.getTracks().forEach((t) => t.stop());
          return false;
        }

        const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );
        if (cancelled) { probeStream.getTracks().forEach((t) => t.stop()); return false; }

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) {
          probeStream.getTracks().forEach((t) => t.stop());
          handLandmarker.close();
          return false;
        }

        const video = document.createElement('video');
        video.srcObject = probeStream;
        video.setAttribute('playsinline', '');
        video.muted = true;
        await video.play();

        // ── Smoothing & detection instances ──
        const smoother = new EMASmoother(0.3);
        const swipeDetector = new SwipeDetector();
        const magicDetector = new MagicGestureDetector();
        let prevSmoothed = { x: 0.5, y: 0.5 };
        const DEAD_ZONE = 0.003; // ignore sub-pixel jitter

        let pinchActive = false;
        let lastHovered: Element | null = null;
        let lastFrameTime = 0;

        function processFrame() {
          if (cancelled) return;
          const now = performance.now();
          if (now - lastFrameTime < 33) {
            rafRef.current = requestAnimationFrame(processFrame);
            return;
          }
          lastFrameTime = now;
          if (video.readyState < 2) {
            rafRef.current = requestAnimationFrame(processFrame);
            return;
          }

          const results = handLandmarker.detectForVideo(video, now);

          if (results.landmarks && results.landmarks.length > 0) {
            const lm = results.landmarks[0];
            const gestures = detectGestures(lm);

            // Raw cursor from index finger tip (mirrored)
            const rawX = 1 - lm[8].x;
            const rawY = lm[8].y;

            // ── Smooth + dead-zone ──
            const smoothed = smoother.update(rawX, rawY);
            const filtered = applyDeadZone(prevSmoothed, smoothed, DEAD_ZONE);
            prevSmoothed = filtered;

            const cursorX = filtered.x;
            const cursorY = filtered.y;
            const screenX = cursorX * window.innerWidth;
            const screenY = cursorY * window.innerHeight;

            // ── Swipe detection (deliberate, center-zone only) ──
            const swipeResult = swipeDetector.update(gestures.isOpenHand, cursorX, cursorY);
            const swipe: 'left' | 'right' | null = null; // discrete swipe only on release

            // ── Magic gesture ──
            const magic = magicDetector.update(gestures.isFist, gestures.isOpenHand);
            if (magic.magicSummon) {
              setGestureLog('\u2728 AI Assistant Summoned');
              setTimeout(() => setGestureLog(null), 2000);
            }

            // ── Hover dispatch (only when NOT swiping) ──
            if (!swipeResult.isSwiping) {
              const el = document.elementFromPoint(screenX, screenY);
              if (el !== lastHovered) {
                if (lastHovered)
                  lastHovered.dispatchEvent(
                    new MouseEvent('mouseleave', { bubbles: true, clientX: screenX, clientY: screenY }),
                  );
                if (el) {
                  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: screenX, clientY: screenY }));
                  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: screenX, clientY: screenY }));
                }
                lastHovered = el;
              }
              if (el) el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: screenX, clientY: screenY }));
            }

            // ── Pinch → click ──
            if (gestures.isPinch && !pinchActive) {
              pinchActive = true;
              const el = document.elementFromPoint(screenX, screenY);
              if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: screenX, clientY: screenY }));
              setGestureLog('Pinch \u2192 Click');
              setTimeout(() => setGestureLog(null), 600);
            }
            if (!gestures.isPinch) pinchActive = false;

            setHand({
              isPresent: true,
              ...gestures,
              cursorX, cursorY, screenX, screenY,
              swipe,
              isSwiping: swipeResult.isSwiping,
              swipeDelta: swipeResult.delta,
              fistHeldMs: magic.fistHeldMs,
              magicSummon: magic.magicSummon,
            });
          } else {
            smoother.reset();
            swipeDetector.reset();
            if (lastHovered) {
              lastHovered.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
              lastHovered = null;
            }
            setHand((h) => ({
              ...h,
              isPresent: false,
              swipe: null,
              isSwiping: false,
              swipeDelta: 0,
              fistHeldMs: 0,
              magicSummon: false,
            }));
          }

          rafRef.current = requestAnimationFrame(processFrame);
        }

        rafRef.current = requestAnimationFrame(processFrame);

        cleanupRef.current = () => {
          cancelled = true;
          cancelAnimationFrame(rafRef.current);
          probeStream.getTracks().forEach((t) => t.stop());
          handLandmarker.close();
          // Clear any stale hover
          if (lastHovered) {
            lastHovered.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
          }
        };

        return true;
      } catch (err) {
        console.warn('Camera hand-tracking unavailable, using mouse fallback.');
        return false;
      }
    }

    /* ────── Mouse fallback ────── */
    function startMouseMode() {
      if (cancelled) return;
      setMode('mouse');

      setHand((h) => ({
        ...h,
        isPresent: true,
        isPointing: true,
        screenX: window.innerWidth / 2,
        screenY: window.innerHeight / 2,
        cursorX: 0.5,
        cursorY: 0.5,
      }));

      const smoother = new EMASmoother(0.5); // lighter smoothing for mouse
      const swipeDetector = new SwipeDetector();
      const magicDetector = new MagicGestureDetector();

      let shiftHeld = false;
      let ctrlHeld = false; // Ctrl = fist for magic gesture
      let idleTimer: ReturnType<typeof setTimeout> | null = null;

      // RAF-batched updates
      let pendingUpdate: Partial<HandState> | null = null;
      let rafId = 0;

      function flushUpdate() {
        rafId = 0;
        if (pendingUpdate) {
          const u = pendingUpdate;
          pendingUpdate = null;
          setHand((h) => ({ ...h, ...u }));
        }
      }

      function scheduleUpdate(partial: Partial<HandState>) {
        pendingUpdate = partial;
        if (!rafId) rafId = requestAnimationFrame(flushUpdate);
      }

      function onKeyDown(e: KeyboardEvent) {
        if (e.key === 'Shift') {
          shiftHeld = true;
          swipeDetector.reset(); // fresh start for each shift press
          setHand((h) => ({ ...h, isOpenHand: true, isPointing: false }));
        }
        if (e.key === 'Control') {
          ctrlHeld = true;
          setHand((h) => ({ ...h, isFist: true, isPointing: false }));
        }
      }

      function onKeyUp(e: KeyboardEvent) {
        if (e.key === 'Shift') {
          shiftHeld = false;
          swipeDetector.reset();
          setHand((h) => ({
            ...h, isOpenHand: false, isPointing: true, isSwiping: false, swipeDelta: 0,
          }));
        }
        if (e.key === 'Control') {
          ctrlHeld = false;
          // Check for magic gesture (ctrl held → release)
          const magic = magicDetector.update(false, true);
          if (magic.magicSummon) {
            setHand((h) => ({ ...h, isFist: false, isPointing: true, magicSummon: true }));
            setGestureLog('\u2728 AI Assistant Summoned');
            setTimeout(() => {
              setGestureLog(null);
              setHand((h) => ({ ...h, magicSummon: false }));
            }, 2000);
          } else {
            setHand((h) => ({ ...h, isFist: false, isPointing: true }));
          }
        }
      }

      function onMouseMove(e: MouseEvent) {
        const rawX = e.clientX / window.innerWidth;
        const rawY = e.clientY / window.innerHeight;
        const smoothed = smoother.update(rawX, rawY);
        const screenX = smoothed.x * window.innerWidth;
        const screenY = smoothed.y * window.innerHeight;

        // Swipe
        let isSwiping = false;
        let swipeDelta = 0;
        if (shiftHeld) {
          const result = swipeDetector.update(true, smoothed.x, smoothed.y);
          isSwiping = result.isSwiping;
          swipeDelta = result.delta;
        }

        // Fist timer (ctrl held)
        let fistHeldMs = 0;
        if (ctrlHeld) {
          const m = magicDetector.update(true, false);
          fistHeldMs = m.fistHeldMs;
        }

        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          setHand((h) => ({ ...h, isPresent: false }));
        }, 3000);

        scheduleUpdate({
          isPresent: true,
          isPointing: !shiftHeld && !ctrlHeld,
          isOpenHand: shiftHeld,
          isFist: ctrlHeld,
          isPinch: false,
          cursorX: smoothed.x,
          cursorY: smoothed.y,
          screenX,
          screenY,
          swipe: null,
          isSwiping,
          swipeDelta,
          fistHeldMs,
          magicSummon: false,
        });
      }

      function onMouseDown(e: MouseEvent) {
        if (e.button !== 0) return;
        setHand((h) => ({ ...h, isPinch: true, isPointing: false }));
        setGestureLog('Pinch \u2192 Click');
        setTimeout(() => setGestureLog(null), 500);
      }

      function onMouseUp(e: MouseEvent) {
        if (e.button !== 0) return;
        setHand((h) => ({ ...h, isPinch: false, isPointing: !shiftHeld && !ctrlHeld }));
      }

      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      cleanupRef.current = () => {
        cancelled = true;
        if (idleTimer) clearTimeout(idleTimer);
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };
    }

    tryCamera().then((ok) => {
      if (cancelled) return;
      if (ok) {
        setMode('camera');
      } else {
        startMouseMode();
      }
    });

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
      cancelAnimationFrame(rafRef.current);
      setHand(defaultHand);
    };
  }, [isActive]);

  return (
    <HandTrackingContext.Provider
      value={{ hand, isActive, mode, toggleTracking, gestureLog }}
    >
      {children}
    </HandTrackingContext.Provider>
  );
}
