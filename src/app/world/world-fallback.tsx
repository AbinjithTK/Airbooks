interface WorldFallbackProps {
  reducedMotion: boolean;
}

/**
 * Pure-CSS grand library fallback — shown when WebGL/three.js isn't available.
 * Warm mahogany tones, subtle shelf silhouettes, soft lamp glow, floating dust.
 */
export function WorldFallback({ reducedMotion }: WorldFallbackProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base dark wood tone */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #1a0e06 0%, #2a1a0d 30%, #3d2211 60%, #2a1508 100%)',
        }}
      />

      {/* Warm overhead lamp glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 55% 25%, rgba(255,210,130,0.15) 0%, rgba(255,180,80,0.05) 40%, transparent 70%)',
        }}
      />

      {/* Secondary side glow (left reading lamp) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 60%, rgba(255,160,64,0.08) 0%, transparent 35%)',
        }}
      />

      {/* Bookshelf silhouettes — back wall */}
      <div className="absolute inset-x-0 top-[10%] bottom-[40%]">
        {SHELF_ROWS.map((row, i) => (
          <div
            key={i}
            className="absolute left-[8%] right-[8%]"
            style={{ top: `${row.top}%`, height: row.height }}
          >
            {/* Shelf plank */}
            <div
              className="absolute inset-x-0 bottom-0 h-[3px]"
              style={{ background: 'linear-gradient(90deg, #5c3a1e 0%, #8b5e3c 50%, #5c3a1e 100%)', opacity: 0.6 }}
            />
            {/* Book spines */}
            <div className="absolute inset-x-0 top-0 bottom-[3px] flex items-end gap-[2px] px-1">
              {row.books.map((book, j) => (
                <div
                  key={j}
                  className="rounded-t-[1px]"
                  style={{
                    width: book.w,
                    height: book.h,
                    background: book.color,
                    opacity: 0.5 + Math.random() * 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Side wall shelf hints (left) */}
      <div
        className="absolute left-0 top-[15%] bottom-[35%] w-[6%]"
        style={{
          background: 'linear-gradient(90deg, rgba(92,58,30,0.4) 0%, transparent 100%)',
        }}
      />

      {/* Side wall shelf hints (right) */}
      <div
        className="absolute right-0 top-[15%] bottom-[35%] w-[6%]"
        style={{
          background: 'linear-gradient(-90deg, rgba(92,58,30,0.4) 0%, transparent 100%)',
        }}
      />

      {/* Floor reflection gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-[30%]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(74,46,24,0.3) 60%, rgba(26,14,6,0.8) 100%)',
        }}
      />

      {/* Vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 70% at 50% 45%, transparent 40%, rgba(10,5,0,0.5) 100%)',
        }}
      />

      {/* Floating dust motes */}
      {!reducedMotion && (
        <div className="absolute inset-0">
          {DUST_MOTES.map((d, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${d.left}%`,
                top: `${d.top}%`,
                width: d.size,
                height: d.size,
                background: 'rgba(255,230,180,0.7)',
                filter: 'blur(0.3px)',
                animation: `airbooks-dust ${d.dur}s ease-in-out ${d.delay}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes airbooks-dust {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.15; }
          50% { transform: translate3d(6px, -12px, 0); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/* ─── Shelf layout data ─── */
const BOOK_COLORS = [
  '#8B0000', '#006400', '#00008B', '#8B4513', '#4B0082',
  '#2F4F4F', '#800000', '#DAA520', '#191970', '#556B2F',
  '#C71585', '#2E8B57', '#483D8B', '#B8860B', '#4A0E4E',
];

function makeBooks(count: number) {
  const books: { w: string; h: string; color: string }[] = [];
  for (let i = 0; i < count; i++) {
    books.push({
      w: `${3 + Math.random() * 5}%`,
      h: `${55 + Math.random() * 40}%`,
      color: BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)],
    });
  }
  return books;
}

const SHELF_ROWS = [
  { top: 5, height: '22%', books: makeBooks(14) },
  { top: 30, height: '22%', books: makeBooks(12) },
  { top: 55, height: '22%', books: makeBooks(15) },
  { top: 80, height: '18%', books: makeBooks(11) },
];

const DUST_MOTES = [
  { left: 20, top: 25, size: 2, dur: 10, delay: 0 },
  { left: 35, top: 40, size: 2, dur: 12, delay: 1.2 },
  { left: 50, top: 18, size: 3, dur: 9, delay: 0.5 },
  { left: 62, top: 55, size: 2, dur: 11, delay: 2 },
  { left: 75, top: 30, size: 2, dur: 13, delay: 0.8 },
  { left: 42, top: 65, size: 3, dur: 10.5, delay: 1.5 },
  { left: 28, top: 50, size: 2, dur: 11.5, delay: 2.5 },
  { left: 80, top: 45, size: 2, dur: 9.5, delay: 0.3 },
  { left: 55, top: 70, size: 2, dur: 12.5, delay: 3 },
  { left: 15, top: 60, size: 3, dur: 10, delay: 1.8 },
  { left: 68, top: 20, size: 2, dur: 11, delay: 0.7 },
  { left: 88, top: 35, size: 2, dur: 9.8, delay: 2.2 },
];
