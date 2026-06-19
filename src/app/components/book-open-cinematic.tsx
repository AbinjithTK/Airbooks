import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book } from '../types';

interface BookOpenCinematicProps {
  book: Book | null;
  onComplete: () => void;
}

/**
 * Full-screen cinematic overlay: a 3D book flies in from the shelf with rotation,
 * the camera pulls back, the cover opens with a page-flip, then fades into the reader.
 * Designed to feel like a game cutscene transition rather than a page navigation.
 */
export function BookOpenCinematic({ book, onComplete }: BookOpenCinematicProps) {
  const [phase, setPhase] = useState<'enter' | 'open' | 'fade'>('enter');

  useEffect(() => {
    if (!book) return;
    setPhase('enter');
    // Phase 1 → 2: book arrives, then opens
    const t1 = setTimeout(() => setPhase('open'), 900);
    // Phase 2 → 3: book opened, fade to reader
    const t2 = setTimeout(() => setPhase('fade'), 2000);
    // Complete: remove overlay
    const t3 = setTimeout(() => onComplete(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [book, onComplete]);

  if (!book) return null;

  const baseColor = book.coverColor;
  const darkColor = adjustBrightness(baseColor, -35);
  const darkerColor = adjustBrightness(baseColor, -55);
  const spineColor = adjustBrightness(baseColor, -45);

  return (
    <AnimatePresence>
      {book && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark cinematic backdrop */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'fade' ? 0 : 1 }}
            transition={{ duration: 0.5 }}
            style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(10,5,0,0.85) 0%, rgba(0,0,0,0.95) 100%)' }}
          />

          {/* Spotlight on book */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{
              opacity: phase === 'fade' ? 0 : 1,
            }}
            style={{
              background: 'radial-gradient(circle at 50% 45%, rgba(255,200,100,0.08) 0%, transparent 50%)',
            }}
          />

          {/* ─── 3D Book ─── */}
          <motion.div
            className="relative"
            style={{ perspective: '1200px' }}
            initial={{ scale: 0.3, y: 200, opacity: 0 }}
            animate={{
              scale: phase === 'enter' ? 1 : phase === 'open' ? 0.85 : 0.6,
              y: phase === 'enter' ? 0 : phase === 'open' ? -20 : -60,
              opacity: phase === 'fade' ? 0 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 60,
              damping: 18,
              mass: 1.2,
            }}
          >
            <motion.div
              style={{ transformStyle: 'preserve-3d' }}
              initial={{ rotateY: -40, rotateX: 15 }}
              animate={{
                rotateY: phase === 'enter' ? 0 : phase === 'open' ? 5 : 0,
                rotateX: phase === 'enter' ? 5 : 0,
              }}
              transition={{
                type: 'spring',
                stiffness: 50,
                damping: 20,
              }}
            >
              {/* Book container */}
              <div
                className="relative"
                style={{
                  width: 280,
                  height: 380,
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* ── Spine ── */}
                <div
                  className="absolute left-0 top-0 bottom-0"
                  style={{
                    width: 30,
                    background: `linear-gradient(90deg, ${darkerColor}, ${spineColor}, ${darkColor})`,
                    transform: 'translateX(-28px) rotateY(-8deg)',
                    borderRadius: '4px 0 0 4px',
                    boxShadow: `inset -2px 0 4px rgba(0,0,0,0.4), -4px 0 12px rgba(0,0,0,0.3)`,
                  }}
                >
                  {/* Spine embossed lines */}
                  <div className="absolute inset-0 flex flex-col justify-center items-center gap-1 opacity-30">
                    <div className="w-[60%] h-[1px] bg-white/40 rounded" />
                    <div className="w-[40%] h-[1px] bg-white/30 rounded" />
                    <div className="w-[60%] h-[1px] bg-white/40 rounded" />
                  </div>
                </div>

                {/* ── Front Cover (animated open) ── */}
                <motion.div
                  className="absolute inset-0 rounded-r-lg overflow-hidden"
                  style={{
                    transformOrigin: 'left center',
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                  }}
                  animate={{
                    rotateY: phase === 'open' || phase === 'fade' ? -120 : 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 35,
                    damping: 15,
                    mass: 1.5,
                  }}
                >
                  {/* Cover face */}
                  <div
                    className="absolute inset-0 rounded-r-lg"
                    style={{
                      background: `linear-gradient(145deg, ${adjustBrightness(baseColor, 10)} 0%, ${baseColor} 35%, ${darkColor} 100%)`,
                      boxShadow: `
                        inset 0 1px 2px rgba(255,255,255,0.2),
                        inset 0 -2px 6px rgba(0,0,0,0.15),
                        4px 4px 20px rgba(0,0,0,0.4)
                      `,
                    }}
                  >
                    {/* Cover glossy highlight */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)',
                        borderRadius: 'inherit',
                      }}
                    />

                    {/* Cover content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                      {/* Decorative frame */}
                      <div
                        className="absolute inset-6 rounded-lg pointer-events-none"
                        style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                      />
                      <div
                        className="absolute inset-8 rounded-md pointer-events-none"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                      />

                      {/* Title */}
                      <h2 className="text-white font-bold text-xl leading-tight mb-3 drop-shadow-lg">
                        {book.title}
                      </h2>
                      <div className="w-12 h-[2px] bg-white/30 rounded mb-3" />
                      <p className="text-white/70 text-sm font-medium drop-shadow">
                        {book.author}
                      </p>
                    </div>

                    {/* Page edges (right) */}
                    <div
                      className="absolute right-0 top-3 bottom-3 w-[6px]"
                      style={{
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, #F5F0E6 30%, #EDE8DC 60%, #E0D8CC 100%)',
                        borderRadius: '0 3px 3px 0',
                      }}
                    />
                  </div>
                </motion.div>

                {/* ── Pages (visible when cover opens) ── */}
                <motion.div
                  className="absolute inset-0 rounded-r-lg"
                  style={{
                    background: 'linear-gradient(90deg, #F5EFE0 0%, #FDF8F0 20%, #FFFEF8 100%)',
                    boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.08), inset -1px 0 3px rgba(0,0,0,0.03)',
                    borderRadius: '0 8px 8px 0',
                  }}
                  animate={{
                    opacity: phase === 'open' || phase === 'fade' ? 1 : 0,
                  }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  {/* Faux text lines */}
                  <div className="absolute inset-0 flex flex-col justify-start p-10 pt-14 gap-[10px]">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-full"
                        style={{
                          height: 3,
                          width: `${55 + Math.random() * 40}%`,
                          background: 'rgba(60,40,20,0.12)',
                        }}
                      />
                    ))}
                  </div>

                  {/* Page fold shadow */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-6"
                    style={{
                      background: 'linear-gradient(90deg, rgba(0,0,0,0.08) 0%, transparent 100%)',
                    }}
                  />
                </motion.div>

                {/* ── Back Cover ── */}
                <div
                  className="absolute inset-0 rounded-r-lg"
                  style={{
                    background: `linear-gradient(145deg, ${darkColor} 0%, ${darkerColor} 100%)`,
                    transform: 'translateZ(-8px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    borderRadius: '0 8px 8px 0',
                  }}
                />

                {/* ── Bottom edge (thickness) ── */}
                <div
                  className="absolute left-0 right-0 bottom-0"
                  style={{
                    height: 8,
                    background: `linear-gradient(180deg, ${darkColor}, ${darkerColor})`,
                    transform: 'translateY(6px)',
                    borderRadius: '0 0 4px 4px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* Floating particles during animation */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: phase === 'fade' ? 0 : 0.6 }}
          >
            {PARTICLES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: p.size,
                  height: p.size,
                  background: `rgba(255,220,150,${p.opacity})`,
                  filter: 'blur(0.5px)',
                }}
                animate={{
                  y: [0, -20, 0],
                  x: [0, p.drift, 0],
                  opacity: [p.opacity * 0.5, p.opacity, p.opacity * 0.3],
                }}
                transition={{
                  duration: p.dur,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: p.delay,
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Particles ─── */
const PARTICLES = Array.from({ length: 20 }).map(() => ({
  x: 20 + Math.random() * 60,
  y: 20 + Math.random() * 60,
  size: 2 + Math.random() * 3,
  opacity: 0.3 + Math.random() * 0.4,
  drift: (Math.random() - 0.5) * 15,
  dur: 4 + Math.random() * 4,
  delay: Math.random() * 3,
}));

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
