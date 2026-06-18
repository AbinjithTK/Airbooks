import { themeRgba } from '../themes/flip-themes';

interface CurlPageProps {
  /** Page width/height in px. */
  width: number;
  height: number;
  /** Left offset of the page within the book (px). */
  left: number;
  frontImage?: string | null;
  backImage?: string | null;
  frontBg: string;
  backBg: string;
  /** 0..1 flip progress. */
  progress: number;
  direction: 'next' | 'prev';
  segments?: number;
  shadowRgb: string;
  highlightRgb: string;
  shadowIntensity: number;
}

interface Strip {
  i: number;
  centerX: number;
  z: number;
  deg: number;
  shade: number;
  edge: number;
}

/**
 * Premium CSS-only page curl.
 *
 * The page is still DOM/CSS (no WebGL), but each vertical strip is positioned at
 * its centre and rotated around the local Y axis. This avoids the disconnected
 * "card slab" look that happens when every slice hinges from its own left edge,
 * while preserving a real 3D arc. The parent performs the book-page swing from
 * the spine; the strips add paper curvature, lighting and a tiny thickness edge.
 */
export function CurlPage({
  width,
  height,
  left,
  frontImage,
  backImage,
  frontBg,
  backBg,
  progress,
  direction,
  segments = 28,
  shadowRgb,
  highlightRgb,
  shadowIntensity,
}: CurlPageProps) {
  const N = Math.max(18, segments);
  const stripWidth = width / N;
  const forward = direction === 'next';
  const clamped = Math.max(0, Math.min(1, progress));

  const swing = clamped * 180;
  const curl = Math.sin(clamped * Math.PI);
  const lateRelax = 1 - Math.max(0, clamped - 0.82) / 0.18;
  const bend = curl * lateRelax * (forward ? 34 : 24);
  const bow = curl * (forward ? -30 : 22);
  const lift = Math.sin(clamped * Math.PI) * 10;
  const si = shadowIntensity;

  const strips: Strip[] = Array.from({ length: N }, (_, i) => {
    const u = (i + 0.5) / N;
    const centered = u - 0.5;
    const mirrorU = forward ? u : 1 - u;
    const leadingBias = Math.pow(mirrorU, 1.6);
    const deg = centered * bend + leadingBias * curl * (forward ? 8 : -6);
    const z = bow * Math.sin(mirrorU * Math.PI) + lift * leadingBias;
    const shade = Math.min(1, Math.abs(deg) / 44 + curl * leadingBias * 0.25);
    return {
      i,
      centerX: i * stripWidth + stripWidth / 2,
      z,
      deg,
      shade,
      edge: leadingBias,
    };
  });

  return (
    <div
      className="absolute top-0 rounded-lg pointer-events-none"
      style={{
        left,
        width,
        height,
        zIndex: 30,
        transformStyle: 'preserve-3d',
        transformOrigin: forward ? '0% 50%' : '100% 50%',
        transform: forward
          ? `rotateY(-${swing}deg)`
          : `rotateY(${swing}deg)`,
        filter: `drop-shadow(0 ${14 + 18 * curl}px ${24 + 30 * curl}px ${themeRgba(shadowRgb, 0.22 * si * curl)})`,
      }}
    >
      {strips.map((s) => {
        const visualIndex = forward ? s.i : N - 1 - s.i;
        const frontCol = forward ? s.i : N - 1 - s.i;
        const backCol = N - 1 - frontCol;
        const seamOverlap = 0.9;
        const radiusMask =
          visualIndex === 0
            ? 'inset(0 0 0 0 round 8px 0 0 8px)'
            : visualIndex === N - 1
              ? 'inset(0 0 0 0 round 0 8px 8px 0)'
              : undefined;

        return (
          <div
            key={s.i}
            className="absolute top-0 overflow-hidden"
            style={{
              left: s.centerX - stripWidth / 2 - seamOverlap / 2,
              width: stripWidth + seamOverlap,
              height,
              transformStyle: 'preserve-3d',
              transformOrigin: '50% 50%',
              transform: `translate3d(0, 0, ${s.z}px) rotateY(${forward ? s.deg : -s.deg}deg)`,
              clipPath: radiusMask,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0.35px)',
                background: frontImage ? `${frontBg} url(${frontImage})` : frontBg,
                backgroundSize: `${width}px ${height}px`,
                backgroundPosition: `${-frontCol * stripWidth}px 0`,
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: [
                    `linear-gradient(to ${forward ? 'left' : 'right'}, ${themeRgba(shadowRgb, 0.09 * si * s.edge * curl)}, transparent 42%)`,
                    `linear-gradient(90deg, transparent, ${themeRgba(highlightRgb, 0.13 * curl * (1 - s.shade))} 48%, transparent)`,
                    themeRgba(shadowRgb, 0.36 * si * s.shade),
                  ].join(','),
                }}
              />
            </div>

            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg) translateZ(0.35px)',
                background: backImage ? `${backBg} url(${backImage})` : backBg,
                backgroundSize: `${width}px ${height}px`,
                backgroundPosition: `${-backCol * stripWidth}px 0`,
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: [
                    `linear-gradient(to ${forward ? 'right' : 'left'}, ${themeRgba(shadowRgb, 0.08 * si * s.edge * curl)}, transparent 46%)`,
                    themeRgba(shadowRgb, 0.28 * si * s.shade),
                  ].join(','),
                }}
              />
            </div>

            {(visualIndex === 0 || visualIndex === N - 1) && (
              <div
                className="absolute top-0 bottom-0 w-px pointer-events-none"
                style={{
                  [visualIndex === 0 ? 'left' : 'right']: 0,
                  background: themeRgba(shadowRgb, 0.12 * si),
                  transform: 'translateZ(0.7px)',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
