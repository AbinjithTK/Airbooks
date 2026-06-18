interface WorldFallbackProps {
  reducedMotion: boolean;
}

/**
 * Pure-CSS stand-in for the 3D study, shown when WebGL is unavailable or when
 * react-three-fiber can't initialize (e.g. the Figma Make editor preview, where
 * a second React instance breaks fiber's reconciler). Evokes the same warm,
 * lamp-lit room mood without any WebGL.
 */
export function WorldFallback({ reducedMotion }: WorldFallbackProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base room tone */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 120%, #2C1810 0%, #1a0e05 45%, #0a0500 75%, #05030a 100%)',
        }}
      />
      {/* Warm desk-lamp glow (upper-left, mirrors the 3D lamp position) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 28% 32%, rgba(255,216,155,0.28) 0%, rgba(255,170,68,0.08) 22%, transparent 48%)',
        }}
      />
      {/* Cool moonlight from the right window */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 82% 28%, rgba(180,212,255,0.14) 0%, transparent 40%)',
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Drifting dust motes (skipped when reduced motion is requested) */}
      {!reducedMotion && (
        <div className="absolute inset-0">
          {DUST.map((d, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${d.left}%`,
                top: `${d.top}%`,
                width: d.size,
                height: d.size,
                background: 'rgba(255,228,196,0.5)',
                filter: 'blur(0.5px)',
                animation: `airbooks-dust ${d.dur}s ease-in-out ${d.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes airbooks-dust {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.15; }
          50% { transform: translate3d(8px, -14px, 0); opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}

// Stable, hand-spread specks so the field looks even.
const DUST = [
  { left: 12, top: 30, size: 3, dur: 9, delay: 0 },
  { left: 22, top: 65, size: 2, dur: 11, delay: 1.5 },
  { left: 34, top: 18, size: 2, dur: 8, delay: 0.8 },
  { left: 44, top: 50, size: 3, dur: 12, delay: 2.2 },
  { left: 56, top: 72, size: 2, dur: 10, delay: 0.4 },
  { left: 63, top: 28, size: 3, dur: 9.5, delay: 1.1 },
  { left: 72, top: 58, size: 2, dur: 11.5, delay: 2.6 },
  { left: 81, top: 40, size: 3, dur: 8.5, delay: 0.2 },
  { left: 88, top: 70, size: 2, dur: 10.5, delay: 1.8 },
  { left: 50, top: 12, size: 2, dur: 12.5, delay: 3 },
];
