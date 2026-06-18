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
  z: number;
  shade: number;
  lead: number;
}

/**
 * Smooth CSS page curl.
 *
 * The page swings about the spine on the parent (rotateY). The curvature comes
 * from vertical strips that stay edge-to-edge (contiguous X) and only vary in
 * DEPTH (translateZ) along a smooth bow. Crucially, strips are NOT individually
 * rotated around their own centres — doing that fans them into a jagged
 * accordion. Depth-only displacement keeps the surface continuous while still
 * reading as a real, curving sheet of paper.
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
  segments = 30,
  shadowRgb,
  highlightRgb,
  shadowIntensity,
}: CurlPageProps) {
  const N = Math.max(20, segments);
  const stripWidth = width / N;
  const forward = direction === 'next';
  const clamped = Math.max(0, Math.min(1, progress));

  const swing = clamped * 180;
  const curl = Math.sin(clamped * Math.PI); // 0 at ends, 1 mid-flip
  // How far the page bellies out of plane. Forward bows away from the viewer
  // (−z), backward bows toward (+z) — that's what makes the two feel different.
  const bowDepth = curl * (forward ? -34 : 26);
  const si = shadowIntensity;

  const strips: Strip[] = Array.from({ length: N }, (_, i) => {
    const u = (i + 0.5) / N; // 0 (left) .. 1 (right)
    const lead = forward ? u : 1 - u; // 0 at spine .. 1 at free edge
    // Belly profile: zero at spine + free edge, peak in between, biased a little
    // toward the leading edge so it feels like the page is being pulled over.
    const profile = Math.sin(u * Math.PI) * (0.65 + 0.35 * lead);
    const z = bowDepth * profile;
    // Shading: the more a strip tilts away (steeper part of the bow) the darker.
    const slope = Math.abs(Math.cos(u * Math.PI));
    const shade = Math.min(1, slope * curl * 0.6 + lead * curl * 0.25);
    return { i, z, shade, lead };
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
        transform: forward ? `rotateY(-${swing}deg)` : `rotateY(${swing}deg)`,
        filter: `drop-shadow(0 ${14 + 18 * curl}px ${24 + 30 * curl}px ${themeRgba(
          shadowRgb,
          0.22 * si * curl,
        )})`,
      }}
    >
      {strips.map((s) => {
        const frontCol = forward ? s.i : N - 1 - s.i;
        const backCol = N - 1 - frontCol;
        const seamOverlap = 1; // hide hairline gaps between strips
        const radiusMask =
          s.i === 0
            ? 'inset(0 round 8px 0 0 8px)'
            : s.i === N - 1
              ? 'inset(0 round 0 8px 8px 0)'
              : undefined;

        return (
          <div
            key={s.i}
            className="absolute top-0 overflow-hidden"
            style={{
              left: s.i * stripWidth - seamOverlap / 2,
              width: stripWidth + seamOverlap,
              height,
              transformStyle: 'preserve-3d',
              // Depth-only displacement → smooth bow, no fanning.
              transform: `translateZ(${s.z}px)`,
              clipPath: radiusMask,
            }}
          >
            {/* Front face slice */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
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
                    `linear-gradient(90deg, transparent, ${themeRgba(highlightRgb, 0.14 * curl * (1 - s.shade))} 50%, transparent)`,
                    themeRgba(shadowRgb, 0.38 * si * s.shade),
                  ].join(','),
                }}
              />
            </div>

            {/* Back face slice (revealed past 90°) */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: backImage ? `${backBg} url(${backImage})` : backBg,
                backgroundSize: `${width}px ${height}px`,
                backgroundPosition: `${-backCol * stripWidth}px 0`,
                backgroundRepeat: 'no-repeat',
              }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: themeRgba(shadowRgb, 0.3 * si * s.shade) }}
              />
            </div>

            {/* Paper thickness at the spine + free edge */}
            {(s.i === 0 || s.i === N - 1) && (
              <div
                className="absolute top-0 bottom-0 w-px pointer-events-none"
                style={{
                  [s.i === 0 ? 'left' : 'right']: 0,
                  background: themeRgba(shadowRgb, 0.14 * si),
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
