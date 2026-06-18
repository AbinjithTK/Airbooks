interface WorldFallbackProps {
  reducedMotion: boolean;
}

/**
 * Pure-CSS green-meadow stand-in, shown when WebGL/three.js isn't available.
 * Mirrors the live three.js world's palette (sky → green hills, warm sun, soft
 * pollen) so the app looks consistent and pleasant on any device.
 */
export function WorldFallback({ reducedMotion }: WorldFallbackProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #bfe4ff 0%, #d8f0c4 46%, #a9d98a 70%, #7cc35f 100%)',
        }}
      />
      {/* Warm sun glow, upper right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 78% 18%, rgba(255,244,212,0.85) 0%, rgba(255,240,180,0.25) 14%, transparent 40%)',
        }}
      />
      {/* Rolling hills */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: '46%',
          background:
            'radial-gradient(120% 90% at 30% 120%, #4f9d3a 0%, #5fae44 40%, #74c057 70%, transparent 100%)',
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: '30%',
          background:
            'radial-gradient(120% 100% at 75% 120%, #3f8a32 0%, #57a23e 55%, transparent 100%)',
        }}
      />
      {/* Soft top vignette for text contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 38%, transparent 55%, rgba(20,40,16,0.28) 100%)',
        }}
      />

      {!reducedMotion && (
        <div className="absolute inset-0">
          {POLLEN.map((d, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${d.left}%`,
                top: `${d.top}%`,
                width: d.size,
                height: d.size,
                background: 'rgba(255,255,210,0.8)',
                filter: 'blur(0.5px)',
                animation: `airbooks-pollen ${d.dur}s ease-in-out ${d.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes airbooks-pollen {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.25; }
          50% { transform: translate3d(10px, -18px, 0); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

const POLLEN = [
  { left: 14, top: 40, size: 3, dur: 9, delay: 0 },
  { left: 24, top: 62, size: 2, dur: 11, delay: 1.5 },
  { left: 36, top: 30, size: 3, dur: 8, delay: 0.8 },
  { left: 46, top: 55, size: 2, dur: 12, delay: 2.2 },
  { left: 57, top: 70, size: 3, dur: 10, delay: 0.4 },
  { left: 64, top: 34, size: 2, dur: 9.5, delay: 1.1 },
  { left: 73, top: 60, size: 3, dur: 11.5, delay: 2.6 },
  { left: 82, top: 44, size: 2, dur: 8.5, delay: 0.2 },
  { left: 88, top: 66, size: 3, dur: 10.5, delay: 1.8 },
  { left: 51, top: 20, size: 2, dur: 12.5, delay: 3 },
];
