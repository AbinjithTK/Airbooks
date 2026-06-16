import { useRef, useEffect, useState } from 'react';
import { useHandTracking } from './hand-tracking-provider';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, Video, VideoOff, MousePointer2, Monitor, Sparkles } from 'lucide-react';

/* ── Cursor colors — high-contrast, NOT blue ── */
const COLORS = {
  point: { ring: '#FF2D78', fill: '#FF2D78', glow: 'rgba(255,45,120,0.6)', bg: 'rgba(255,45,120,0.15)' },
  pinch: { ring: '#FFD600', fill: '#FFD600', glow: 'rgba(255,214,0,0.7)', bg: 'rgba(255,214,0,0.2)' },
  open:  { ring: '#00FF94', fill: '#00FF94', glow: 'rgba(0,255,148,0.6)', bg: 'rgba(0,255,148,0.18)' },
  fist:  { ring: '#FF8C00', fill: '#FF8C00', glow: 'rgba(255,140,0,0.5)', bg: 'rgba(255,140,0,0.12)' },
  magic: { ring: '#BF5AF2', fill: '#BF5AF2', glow: 'rgba(191,90,242,0.8)', bg: 'rgba(191,90,242,0.25)' },
  idle:  { ring: '#FF2D78', fill: '#FF2D78', glow: 'rgba(255,45,120,0.4)', bg: 'rgba(255,45,120,0.1)' },
};

function getColor(hand: {
  isPinch: boolean; isOpenHand: boolean; isPointing: boolean; isFist: boolean; fistHeldMs: number;
}) {
  if (hand.fistHeldMs > 1200) return COLORS.magic; // about to summon
  if (hand.isPinch) return COLORS.pinch;
  if (hand.isOpenHand) return COLORS.open;
  if (hand.isFist) return COLORS.fist;
  if (hand.isPointing) return COLORS.point;
  return COLORS.idle;
}

/** Responsive cursor size: scales with viewport */
function useCursorSize() {
  const [size, setSize] = useState(() => Math.max(40, Math.min(64, window.innerWidth * 0.04)));
  useEffect(() => {
    const onResize = () => setSize(Math.max(40, Math.min(64, window.innerWidth * 0.04)));
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

export function HandCursorOverlay() {
  const { hand, isActive, mode, toggleTracking, gestureLog } = useHandTracking();
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showHelp, setShowHelp] = useState(true);
  const [showMagicOverlay, setShowMagicOverlay] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const cursorSize = useCursorSize();
  const half = cursorSize / 2;

  /* ═══ Direct DOM cursor refs ═══ */
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const fistRingRef = useRef<SVGCircleElement>(null);

  // Update cursor position directly on the DOM
  useEffect(() => {
    if (!isActive || !hand.isPresent) return;

    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate(${hand.screenX - half}px, ${hand.screenY - half}px)`;
      cursorRef.current.style.opacity = '1';
    }

    const c = getColor(hand);
    if (ringRef.current) {
      ringRef.current.style.borderColor = c.ring;
      ringRef.current.style.backgroundColor = c.bg;
      ringRef.current.style.boxShadow = `0 0 ${cursorSize * 0.5}px 6px ${c.glow}, 0 0 ${cursorSize}px 12px ${c.glow}`;
    }
    if (dotRef.current) {
      dotRef.current.style.backgroundColor = c.fill;
      dotRef.current.style.boxShadow = `0 0 8px ${c.fill}`;
      dotRef.current.style.transform = `scale(${hand.isPinch ? 2.2 : 1})`;
    }
    if (haloRef.current) {
      haloRef.current.style.borderColor = c.ring;
      haloRef.current.style.opacity = hand.isPinch || hand.isOpenHand || hand.fistHeldMs > 500 ? '0.6' : '0.25';
    }
    if (labelRef.current) {
      labelRef.current.textContent = hand.isPinch ? 'CLICK'
        : hand.isSwiping ? `SWIPE ${hand.swipeDelta < 0 ? '\u2190' : '\u2192'} ${Math.round(Math.abs(hand.swipeDelta) * 100)}%`
        : hand.isOpenHand ? 'SWIPE'
        : hand.fistHeldMs > 1200 ? '\u2728 SUMMONING...'
        : hand.isFist ? 'FIST'
        : hand.isPointing ? 'POINT'
        : 'TRACK';
    }
    // Fist progress ring
    if (fistRingRef.current) {
      const circumference = Math.PI * (cursorSize - 6);
      if (hand.isFist && hand.fistHeldMs > 200) {
        const progress = Math.min(hand.fistHeldMs / 1500, 1);
        fistRingRef.current.style.strokeDashoffset = String(circumference * (1 - progress));
        fistRingRef.current.style.opacity = '1';
      } else {
        fistRingRef.current.style.strokeDashoffset = String(circumference);
        fistRingRef.current.style.opacity = '0';
      }
    }
  });

  // Hide when not present
  useEffect(() => {
    if (!isActive || !hand.isPresent) {
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
    }
  }, [isActive, hand.isPresent]);

  /* ── Magic summon gesture handler ── */
  useEffect(() => {
    if (hand.magicSummon) {
      setShowMagicOverlay(true);
      // Auto-hide after 5s
      const t = setTimeout(() => setShowMagicOverlay(false), 5000);
      return () => clearTimeout(t);
    }
  }, [hand.magicSummon]);

  /* ── Fist gesture → go back (when in reader, short fist tap) ── */
  const fistNavRef = useRef<{ start: number; handled: boolean }>({ start: 0, handled: false });
  useEffect(() => {
    if (!isActive) return;
    if (hand.isFist) {
      if (fistNavRef.current.start === 0) {
        fistNavRef.current = { start: Date.now(), handled: false };
      }
    } else {
      // Fist released — if it was a short tap (300-1200ms) and we're in reader, go back
      const elapsed = Date.now() - fistNavRef.current.start;
      if (fistNavRef.current.start > 0 && !fistNavRef.current.handled && elapsed > 300 && elapsed < 1200) {
        if (location.pathname.startsWith('/read/')) {
          navigate('/');
        }
      }
      fistNavRef.current = { start: 0, handled: false };
    }
  }, [hand.isFist, isActive, location.pathname, navigate]);

  // Hide system cursor
  useEffect(() => {
    if (isActive) {
      const style = document.createElement('style');
      style.id = 'hand-tracking-cursor-hide';
      style.textContent = '* { cursor: none !important; }';
      document.head.appendChild(style);
      return () => {
        const el = document.getElementById('hand-tracking-cursor-hide');
        if (el) el.remove();
      };
    }
  }, [isActive]);

  // Auto-hide help
  useEffect(() => {
    if (!isActive) { setShowHelp(true); return; }
    const t = setTimeout(() => setShowHelp(false), 6000);
    return () => clearTimeout(t);
  }, [isActive, mode]);

  // Webcam preview
  useEffect(() => {
    if (!isActive || mode !== 'camera') return;
    let cancelled = false;
    async function attach() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(() => {});
        }
      } catch {}
    }
    attach();
    return () => {
      cancelled = true;
      if (videoPreviewRef.current?.srcObject) {
        (videoPreviewRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        videoPreviewRef.current.srcObject = null;
      }
    };
  }, [isActive, mode]);

  const circumference = Math.PI * (cursorSize - 6);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={toggleTracking}
        className="fixed bottom-6 right-6 z-[9999] p-3.5 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95"
        style={{
          background: isActive ? 'linear-gradient(135deg, #FF2D78, #FF6B9D)' : 'rgba(30,41,59,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
        title={isActive ? 'Disable gesture control' : 'Enable gesture control'}
      >
        <Hand className="w-5 h-5 text-white" />
      </button>

      {isActive && (
        <>
          {/* ═══ Direct DOM cursor ═══ */}
          <div
            ref={cursorRef}
            className="fixed top-0 left-0 pointer-events-none z-[9998]"
            style={{ opacity: 0, willChange: 'transform' }}
          >
            {/* Outer pulsing halo */}
            <div
              ref={haloRef}
              className="absolute rounded-full"
              style={{
                width: cursorSize,
                height: cursorSize,
                border: '1.5px solid #FF2D78',
                opacity: 0.25,
                animation: 'cursorPulse 2s ease-in-out infinite',
              }}
            />

            {/* Fist progress ring (SVG arc) */}
            <svg
              className="absolute"
              width={cursorSize}
              height={cursorSize}
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                ref={fistRingRef}
                cx={cursorSize / 2}
                cy={cursorSize / 2}
                r={(cursorSize - 6) / 2}
                fill="none"
                stroke="#BF5AF2"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                style={{ opacity: 0, transition: 'stroke-dashoffset 0.1s linear, opacity 0.2s' }}
              />
            </svg>

            {/* Main ring */}
            <div
              ref={ringRef}
              className="absolute rounded-full flex items-center justify-center"
              style={{
                width: cursorSize,
                height: cursorSize,
                border: '3px solid #FF2D78',
                backgroundColor: 'rgba(255,45,120,0.15)',
                boxShadow: `0 0 ${cursorSize * 0.5}px 6px rgba(255,45,120,0.6)`,
                transition: 'border-color 0.12s, background-color 0.12s, box-shadow 0.12s',
              }}
            >
              {/* Crosshair */}
              <div className="absolute" style={{ width: cursorSize * 0.35, height: 2, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
              <div className="absolute" style={{ width: 2, height: cursorSize * 0.35, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
              {/* Center dot */}
              <div
                ref={dotRef}
                className="absolute rounded-full"
                style={{
                  width: cursorSize * 0.18,
                  height: cursorSize * 0.18,
                  backgroundColor: '#FF2D78',
                  boxShadow: '0 0 10px #FF2D78',
                  transition: 'transform 0.1s ease, background-color 0.12s',
                }}
              />
            </div>

            {/* Label */}
            <div
              ref={labelRef}
              className="absolute whitespace-nowrap font-bold tracking-wider"
              style={{
                left: cursorSize + 8,
                top: cursorSize * 0.3,
                fontSize: Math.max(10, cursorSize * 0.2),
                color: '#fff',
                textShadow: '0 0 8px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)',
                letterSpacing: '0.08em',
              }}
            >
              POINT
            </div>
          </div>

          {/* Pulse keyframes */}
          <style>{`
            @keyframes cursorPulse {
              0%, 100% { transform: scale(1); opacity: 0.25; }
              50% { transform: scale(1.35); opacity: 0.08; }
            }
          `}</style>

          {/* ── Magic AI Assistant overlay ── */}
          <AnimatePresence>
            {showMagicOverlay && (
              <motion.div
                className="fixed inset-0 z-[9997] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Backdrop */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(191,90,242,0.15) 0%, rgba(0,0,0,0.5) 100%)' }}
                  onClick={() => setShowMagicOverlay(false)}
                />

                <motion.div
                  className="relative z-10 flex flex-col items-center gap-6 p-10 rounded-3xl max-w-md mx-4"
                  style={{
                    background: 'rgba(10,22,40,0.95)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(191,90,242,0.3)',
                    boxShadow: '0 0 80px rgba(191,90,242,0.2), 0 32px 64px rgba(0,0,0,0.5)',
                  }}
                  initial={{ scale: 0.7, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.8, y: 20 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                >
                  {/* Glowing orb */}
                  <motion.div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: 'radial-gradient(circle, rgba(191,90,242,0.4) 0%, rgba(191,90,242,0.1) 60%, transparent 100%)',
                      boxShadow: '0 0 40px rgba(191,90,242,0.5), 0 0 80px rgba(191,90,242,0.2)',
                    }}
                    animate={{ scale: [1, 1.15, 1], boxShadow: [
                      '0 0 40px rgba(191,90,242,0.5), 0 0 80px rgba(191,90,242,0.2)',
                      '0 0 60px rgba(191,90,242,0.7), 0 0 120px rgba(191,90,242,0.3)',
                      '0 0 40px rgba(191,90,242,0.5), 0 0 80px rgba(191,90,242,0.2)',
                    ]}}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Sparkles className="w-10 h-10 text-[#BF5AF2]" />
                  </motion.div>

                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">AirBooks AI</h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      How can I help you today? I can summarize books, find passages, recommend reading, or explain concepts.
                    </p>
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {['Summarize this book', 'Recommend similar', 'Find a quote', 'Reading stats'].map((action) => (
                      <button
                        key={action}
                        className="px-3 py-2.5 rounded-xl text-xs font-medium text-white/80 hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          background: 'rgba(191,90,242,0.1)',
                          border: '1px solid rgba(191,90,242,0.2)',
                        }}
                        onClick={() => setShowMagicOverlay(false)}
                      >
                        {action}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowMagicOverlay(false)}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors mt-2"
                  >
                    Dismiss · Hold fist 1.5s to summon again
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Gesture toast ── */}
          <AnimatePresence>
            {gestureLog && (
              <motion.div
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[9998] px-5 py-2.5 rounded-full text-sm font-medium text-white"
                style={{
                  background: gestureLog.includes('\u2728') ? 'rgba(191,90,242,0.9)' : 'rgba(255,45,120,0.9)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: gestureLog.includes('\u2728')
                    ? '0 8px 32px rgba(191,90,242,0.3)'
                    : '0 8px 32px rgba(255,45,120,0.3)',
                }}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.25 }}
              >
                {gestureLog}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Camera preview ── */}
          {mode === 'camera' && (
            <div className="fixed bottom-6 left-6 z-[9998]">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="absolute -top-8 left-0 p-1 rounded-md text-white/70 hover:text-white transition-colors"
                style={{ background: 'rgba(0,0,0,0.5)' }}
              >
                {showPreview ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              </button>
              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className="relative overflow-hidden rounded-xl shadow-2xl"
                    style={{ width: 200, height: 150, border: '2px solid rgba(255,45,120,0.3)', background: '#000' }}
                  >
                    <video ref={videoPreviewRef} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} muted playsInline autoPlay />
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: hand.isPresent ? '#00FF94' : '#94A3B8' }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: hand.isPresent ? '#00FF94' : '#94A3B8', boxShadow: hand.isPresent ? '0 0 6px #00FF94' : 'none' }} />
                      {hand.isPresent ? 'Tracking' : 'No hand'}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[8px] text-white/60 flex justify-between"
                      style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                      <span>Point=Move</span>
                      <span>Pinch=Click</span>
                      <span>Open=Swipe</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── Mouse mode: controls legend ── */}
          {mode === 'mouse' && (
            <div className="fixed bottom-6 left-6 z-[9998]">
              <AnimatePresence>
                {showHelp && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="rounded-xl overflow-hidden shadow-2xl"
                    style={{
                      width: 260,
                      background: 'rgba(10,22,40,0.94)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255,45,120,0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,45,120,0.2)' }}>
                        <Monitor className="w-3.5 h-3.5 text-[#FF2D78]" />
                      </div>
                      <span className="text-[11px] font-semibold text-white/90">Gesture Controls</span>
                    </div>

                    <div className="px-3 py-2.5 space-y-2">
                      <LegendRow color="#FF2D78" keys={['Move']} label="Point & navigate" />
                      <LegendRow color="#FFD600" keys={['Click']} label="Pinch / select" />
                      <LegendRow color="#00FF94" keys={['Shift', '+ Sweep']} label="Swipe pages (center)" />
                      <LegendRow color="#FF8C00" keys={['Ctrl', '(tap)']} label="Fist = go back" />
                      <LegendRow color="#BF5AF2" keys={['Ctrl', '(hold 1.5s)']} label="Summon AI ✨" />
                    </div>

                    <div className="px-3 py-1.5 text-[9px] text-white/30 border-t border-white/5">
                      Camera unavailable — using mouse fallback
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="mt-2 px-2.5 py-1 rounded-lg text-[10px] font-medium text-white/60 hover:text-white/90 transition-colors"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
                {showHelp ? 'Hide controls' : 'Show controls'}
              </button>
            </div>
          )}

          {/* ── "No hand" prompt ── */}
          {mode === 'camera' && (
            <AnimatePresence>
              {!hand.isPresent && (
                <motion.div
                  className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9997] pointer-events-none flex flex-col items-center gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 2, duration: 0.5 }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,45,120,0.1)', border: '2px dashed rgba(255,45,120,0.3)' }}
                  >
                    <MousePointer2 className="w-8 h-8 text-[#FF2D78]/50" />
                  </motion.div>
                  <p className="text-sm text-[#64748B] dark:text-[#94A3B8] text-center max-w-[200px]">
                    Show your hand to the camera to begin
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </>
      )}
    </>
  );
}

/* ── Legend row ── */
function LegendRow({ color, keys, label }: { color: string; keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i}>
            {k.startsWith('+') || k.startsWith('(') ? (
              <span className="text-[10px] text-white/40">{k}</span>
            ) : (
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono text-white/80"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {k}
              </kbd>
            )}
          </span>
        ))}
      </div>
      <span className="text-[10px] text-white/50 ml-auto">{label}</span>
    </div>
  );
}