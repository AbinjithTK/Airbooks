import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';

interface Book3DPreviewProps {
  /** Cover color (hex) */
  color: string;
  /** Book title */
  title: string;
  /** Author name */
  author: string;
  /** Category label */
  category?: string;
  /** Current step (0-3) — drives auto-animations per phase */
  step?: number;
  /** If true, user can drag to orbit */
  interactive?: boolean;
  /** Zoom level 0.6–1.8 */
  zoom?: number;
}

/**
 * A fully 3D CSS book model with rounded edges, specular lighting, and interactive
 * orbit controls. Designed like a car-customizer showroom: the book floats in space,
 * users can drag-rotate and scroll-zoom. Each creation step triggers a cinematic
 * camera angle change.
 */
export function Book3DPreview({
  color,
  title,
  author,
  category,
  step = 0,
  interactive = true,
  zoom = 1,
}: Book3DPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Rotation state — motion values for smooth spring physics
  const rotateY = useMotionValue(getStepRotation(step).y);
  const rotateX = useMotionValue(getStepRotation(step).x);
  const springY = useSpring(rotateY, { stiffness: 80, damping: 20 });
  const springX = useSpring(rotateX, { stiffness: 80, damping: 20 });

  // Zoom spring
  const zoomVal = useMotionValue(zoom);
  const springZoom = useSpring(zoomVal, { stiffness: 120, damping: 22 });

  // Update zoom when prop changes
  useEffect(() => { zoomVal.set(zoom); }, [zoom]);

  // Auto-rotate to step angle when step changes (only if not dragging)
  useEffect(() => {
    if (!isDragging.current) {
      const target = getStepRotation(step);
      rotateY.set(target.y);
      rotateX.set(target.x);
    }
  }, [step]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return;
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [interactive]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !interactive) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    rotateY.set(rotateY.get() + dx * 0.4);
    rotateX.set(Math.max(-30, Math.min(30, rotateX.get() - dy * 0.3)));
  }, [interactive]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Scroll to zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!interactive) return;
    e.preventDefault();
    const next = Math.max(0.6, Math.min(1.8, zoomVal.get() - e.deltaY * 0.001));
    zoomVal.set(next);
  }, [interactive]);

  const darkColor = adjustBrightness(color, -30);
  const darkerColor = adjustBrightness(color, -50);
  const lightColor = adjustBrightness(color, 15);
  const spineColor = adjustBrightness(color, -40);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center select-none"
      style={{ perspective: '1200px' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Floating platform shadow */}
      <motion.div
        className="absolute bottom-[15%] left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '60%',
          height: 20,
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%)',
          filter: 'blur(8px)',
          scale: springZoom,
        }}
      />

      {/* 3D Book container */}
      <motion.div
        style={{
          rotateY: springY,
          rotateX: springX,
          scale: springZoom,
          transformStyle: 'preserve-3d',
        }}
        className="relative cursor-grab active:cursor-grabbing"
      >
        <div
          style={{
            width: 220,
            height: 300,
            transformStyle: 'preserve-3d',
            position: 'relative',
          }}
        >
          {/* ── Front Cover ── */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(145deg, ${lightColor} 0%, ${color} 35%, ${darkColor} 100%)`,
              borderRadius: 16,
              transform: 'translateZ(12px)',
              boxShadow: `
                0 8px 32px -8px rgba(0,0,0,0.4),
                inset 0 1px 2px rgba(255,255,255,0.25),
                inset 0 -2px 6px rgba(0,0,0,0.15)
              `,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Glossy layer */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 30%, transparent 55%, rgba(0,0,0,0.05) 100%)',
              }}
            />
            {/* Specular dot */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '8%',
                left: '12%',
                width: 40,
                height: 24,
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.35), transparent 70%)',
              }}
            />

            {/* Cover content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-7 text-center">
              {/* Rounded decorative frame */}
              <div
                className="absolute inset-5 pointer-events-none"
                style={{
                  border: '1.5px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                }}
              />

              <h3 className="text-white font-bold text-base leading-tight mb-2 drop-shadow-lg max-w-[80%]">
                {title || 'Book Title'}
              </h3>
              <div className="w-8 h-[2px] bg-white/25 rounded-full mb-2" />
              <p className="text-white/65 text-xs font-medium drop-shadow">
                {author || 'Author'}
              </p>
              {category && (
                <span className="mt-4 text-[9px] text-white/40 uppercase tracking-[0.15em]">
                  {category}
                </span>
              )}
            </div>

            {/* Right page edges — rounded */}
            <div
              className="absolute right-0 top-4 bottom-4 w-[6px] pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.03), #F5F0E6 30%, #EDE8DC 60%, #E0D8CC 100%)',
                borderRadius: '0 8px 8px 0',
              }}
            />
          </div>

          {/* ── Back Cover ── */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(145deg, ${darkColor} 0%, ${darkerColor} 100%)`,
              borderRadius: 16,
              transform: 'translateZ(-12px) rotateY(180deg)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          />

          {/* ── Spine (left) — rounded cylinder look ── */}
          <div
            className="absolute top-0 bottom-0 left-0"
            style={{
              width: 24,
              transform: 'translateX(-12px) rotateY(-90deg) translateZ(0px)',
              transformOrigin: 'right center',
              background: `linear-gradient(90deg, ${darkerColor} 0%, ${spineColor} 30%, ${darkColor} 70%, ${darkerColor} 100%)`,
              borderRadius: '12px 0 0 12px',
              boxShadow: 'inset 1px 0 3px rgba(255,255,255,0.06), inset -2px 0 4px rgba(0,0,0,0.3)',
            }}
          >
            {/* Spine emboss lines */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6px] opacity-25">
              <div className="w-[50%] h-[1.5px] bg-white/50 rounded-full" />
              <div className="w-[30%] h-[1.5px] bg-white/35 rounded-full" />
              <div className="w-[50%] h-[1.5px] bg-white/50 rounded-full" />
            </div>
          </div>

          {/* ── Top edge — rounded ── */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: 24,
              transform: 'translateY(-12px) rotateX(90deg)',
              transformOrigin: 'bottom center',
              background: `linear-gradient(180deg, #F5EFE0 0%, #EDE5D5 50%, #E0D8CC 100%)`,
              borderRadius: '12px 12px 0 0',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3)',
            }}
          />

          {/* ── Bottom edge — rounded ── */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 24,
              transform: 'translateY(12px) rotateX(-90deg)',
              transformOrigin: 'top center',
              background: `linear-gradient(180deg, #E0D8CC 0%, #D4C8B8 50%, #C8BBAA 100%)`,
              borderRadius: '0 0 12px 12px',
              boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.1)',
            }}
          />

          {/* ── Right edge (page edges) — rounded ── */}
          <div
            className="absolute top-0 bottom-0 right-0"
            style={{
              width: 24,
              transform: 'translateX(12px) rotateY(90deg)',
              transformOrigin: 'left center',
              background: `linear-gradient(90deg, #F8F2E8 0%, #F0E8D8 20%, #EDE5D5 50%, #E8DFD0 80%, #E0D8CC 100%)`,
              borderRadius: '0 12px 12px 0',
              boxShadow: 'inset -1px 0 3px rgba(0,0,0,0.06)',
            }}
          >
            {/* Page line details */}
            <div className="absolute inset-0 flex flex-col justify-center items-end pr-1 opacity-20">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="w-[1px] h-[90%] bg-amber-900/20 ml-[2px]" style={{ marginTop: 1 }} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Interactive hint */}
      {interactive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/30 tracking-wider uppercase pointer-events-none">
          Drag to rotate &bull; Scroll to zoom
        </div>
      )}
    </div>
  );
}

/* ─── Step-based camera angles (car customizer style) ─── */
function getStepRotation(step: number): { x: number; y: number } {
  switch (step) {
    case 0: return { x: 5, y: -25 };   // Upload: angled front view
    case 1: return { x: 0, y: 0 };     // Details: straight on
    case 2: return { x: 8, y: 30 };    // Theme: show spine + back
    case 3: return { x: -5, y: -15 };  // Preview: hero angle
    default: return { x: 5, y: -20 };
  }
}

/* ─── Color helper ─── */
function adjustBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}
