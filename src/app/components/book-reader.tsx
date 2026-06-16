import { useAppContext } from './app-layout';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, BookOpen, Share2, Copy, Check, Link2, Code2, Upload as UploadIcon, ExternalLink } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { getPdfAsync, getOrLoadPdfDocument, evictPdfDocument, hasPdf } from '../pdf-store';
import * as pdfjsLib from 'pdfjs-dist';
import { useHandTracking } from './hand-tracking-provider';
import { FlipTheme, ReaderTheme, Book } from '../types';
import { flipThemes, FlipThemeConfig, themeRgba } from '../themes/flip-themes';
import { readerThemes, ReaderThemeConfig } from '../themes/reader-themes';
import { AnimatePresence, motion } from 'motion/react';
import { buildShareUrl, buildEmbedCode, uploadPdfToCloud, shareBook } from '../supabase-books';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

const PAGE_WIDTH = 380;
const PAGE_HEIGHT = 540;

/* ─── PDF page renderer hook (HQ, dpr-aware, document-cached) ─── */
function usePdfPageImage(
  bookId: string,
  pageNum: number,
  pdfUrl?: string,
  pageBg = '#FFFFFF',
) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pageNum < 1) { setDataUrl(null); return; }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const pdfData = await getPdfAsync(bookId, pdfUrl);
        if (!pdfData || cancelled) return;

        const pdf = await getOrLoadPdfDocument(bookId, pdfData);
        if (pageNum > pdf.numPages) {
          if (!cancelled) { setDataUrl(null); setLoading(false); }
          return;
        }

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const dpr = window.devicePixelRatio || 1;
        const scale = Math.min(PAGE_WIDTH / viewport.width, PAGE_HEIGHT / viewport.height) * dpr;
        const scaledVp = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = scaledVp.width;
        canvas.height = scaledVp.height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = pageBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({
          canvasContext: ctx,
          viewport: scaledVp,
          intent: 'display',
        }).promise;

        if (!cancelled) {
          setDataUrl(canvas.toDataURL('image/jpeg', 0.92));
          setLoading(false);
        }
      } catch {
        if (!cancelled) { setDataUrl(null); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [bookId, pageNum, pdfUrl, pageBg]);

  return { dataUrl, loading };
}

/* ─── Flip state machine ─── */
type FlipDirection = 'next' | 'prev';
interface FlipState {
  direction: FlipDirection;
  progress: number;
  isDragging: boolean;
}

const SNAP_THRESHOLD = 0.35;
const PAPER_TEXTURE = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")";

interface BookReaderCoreProps {
  book: Book & { id: string; title: string; author: string };
  pdfBuffer?: ArrayBuffer | null;
  onShareClick?: () => void;
  hideClose?: boolean;
  onThemeChange?: (themes: { flipTheme?: FlipTheme; readerTheme?: ReaderTheme }) => void;
}

export function BookReaderCore({ book, pdfBuffer, onShareClick, hideClose, onThemeChange }: BookReaderCoreProps) {
  const navigate = useNavigate();

  const [currentSpread, setCurrentSpread] = useState(0);
  const [flip, setFlip] = useState<FlipState | null>(null);
  const [activeFlipTheme, setActiveFlipTheme] = useState<FlipTheme>(book.flipTheme ?? 'classic');
  const [activeReaderTheme, setActiveReaderTheme] = useState<ReaderTheme>(book.readerTheme ?? 'white');

  const chooseFlipTheme = (t: FlipTheme) => {
    setActiveFlipTheme(t);
    onThemeChange?.({ flipTheme: t });
  };
  const chooseReaderTheme = (t: ReaderTheme) => {
    setActiveReaderTheme(t);
    onThemeChange?.({ readerTheme: t });
  };
  const [showThemePicker, setShowThemePicker] = useState(false);
  const animRef = useRef<number>(0);
  const bookAreaRef = useRef<HTMLDivElement>(null);

  const ft = flipThemes[activeFlipTheme];
  const rt = readerThemes[activeReaderTheme];

  const dragRef = useRef({
    active: false,
    startX: 0,
    direction: 'next' as FlipDirection,
  });

  // Determine if we have a usable PDF
  const pdfAvailable = pdfBuffer
    ? true
    : (book.hasPdf && (hasPdf(book.id) || !!book.pdfUrl));
  const totalPages = pdfAvailable ? (book.totalPdfPages || book.pages) : book.pages;
  const totalSpreads = Math.ceil(totalPages / 2);

  const leftPageNum = currentSpread * 2 + 1;
  const rightPageNum = currentSpread * 2 + 2;

  // If a direct buffer was passed, inject it into the store under the book id
  useEffect(() => {
    if (pdfBuffer) {
      import('../pdf-store').then(({ storePdf }) => storePdf(book.id, pdfBuffer));
    }
    return () => evictPdfDocument(book.id);
  }, [book.id, pdfBuffer]);

  const pdfUrl = book.pdfUrl;
  const pageBg = rt.pageBackground;

  const leftPage = usePdfPageImage(book.id, pdfAvailable ? leftPageNum : -1, pdfUrl, pageBg);
  const rightPage = usePdfPageImage(book.id, pdfAvailable ? rightPageNum : -1, pdfUrl, pageBg);
  const nextLeftPage = usePdfPageImage(book.id, pdfAvailable ? rightPageNum + 1 : -1, pdfUrl, pageBg);
  const nextRightPage = usePdfPageImage(book.id, pdfAvailable ? rightPageNum + 2 : -1, pdfUrl, pageBg);
  const prevLeftPage = usePdfPageImage(book.id, pdfAvailable ? leftPageNum - 2 : -1, pdfUrl, pageBg);
  const prevRightPage = usePdfPageImage(book.id, pdfAvailable ? leftPageNum - 1 : -1, pdfUrl, pageBg);

  /* ── Animation helpers ── */
  const animateSnap = useCallback((
    fromProgress: number,
    toProgress: number,
    direction: FlipDirection,
    onComplete: () => void,
  ) => {
    cancelAnimationFrame(animRef.current);
    const startTime = performance.now();
    const distance = Math.abs(toProgress - fromProgress);
    const duration = Math.max(150, Math.min(500, distance * 600));

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(elapsed / duration, 1);
      const t = 1 - Math.pow(1 - rawT, 3);
      const progress = fromProgress + (toProgress - fromProgress) * t;
      setFlip({ direction, progress, isDragging: false });
      if (rawT < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    };
    animRef.current = requestAnimationFrame(tick);
  }, []);

  const releaseFlip = useCallback((direction: FlipDirection, currentProgress: number) => {
    if (currentProgress > SNAP_THRESHOLD) {
      animateSnap(currentProgress, 1, direction, () => {
        setCurrentSpread(prev => direction === 'next' ? prev + 1 : prev - 1);
        setFlip(null);
      });
    } else {
      animateSnap(currentProgress, 0, direction, () => setFlip(null));
    }
  }, [animateSnap]);

  const autoFlip = useCallback((direction: FlipDirection) => {
    if (flip) return;
    if (direction === 'next' && currentSpread >= totalSpreads - 1) return;
    if (direction === 'prev' && currentSpread <= 0) return;
    animateSnap(0, 1, direction, () => {
      setCurrentSpread(prev => direction === 'next' ? prev + 1 : prev - 1);
      setFlip(null);
    });
  }, [flip, currentSpread, totalSpreads, animateSnap]);

  /* ── Mouse drag ── */
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      const { startX, direction } = dragRef.current;
      const deltaX = e.clientX - startX;
      const progress = direction === 'next'
        ? Math.max(0, Math.min(1, -deltaX / (PAGE_WIDTH * 1.2)))
        : Math.max(0, Math.min(1, deltaX / (PAGE_WIDTH * 1.2)));
      setFlip({ direction, progress, isDragging: true });
    };
    const onMouseUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setFlip(prev => {
        if (!prev) return null;
        releaseFlip(prev.direction, prev.progress);
        return prev;
      });
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [releaseFlip]);

  const startPageDrag = useCallback((e: React.MouseEvent, direction: FlipDirection) => {
    if (flip && !flip.isDragging) return;
    if (direction === 'next' && currentSpread >= totalSpreads - 1) return;
    if (direction === 'prev' && currentSpread <= 0) return;
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, direction };
    setFlip({ direction, progress: 0, isDragging: true });
  }, [flip, currentSpread, totalSpreads]);

  useEffect(() => { return () => cancelAnimationFrame(animRef.current); }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') autoFlip('next');
      if (e.key === 'ArrowLeft') autoFlip('prev');
      if (e.key === 'Escape' && !hideClose) navigate('/');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [autoFlip, navigate, hideClose]);

  /* ── Hand gesture ── */
  const { hand, isActive: gestureActive } = useHandTracking();
  const gestureRef = useRef({ lockedDirection: null as FlipDirection | null, lastSwipeDelta: 0 });

  useEffect(() => {
    if (!gestureActive || !hand) return;
    const g = gestureRef.current;
    if (hand.isSwiping) {
      if (!g.lockedDirection && Math.abs(hand.swipeDelta) > 0.08) {
        if (hand.swipeDelta < 0 && currentSpread < totalSpreads - 1) g.lockedDirection = 'next';
        else if (hand.swipeDelta > 0 && currentSpread > 0) g.lockedDirection = 'prev';
      }
      if (g.lockedDirection) {
        const progress = Math.max(0, Math.min(1, Math.abs(hand.swipeDelta)));
        g.lastSwipeDelta = progress;
        setFlip({ direction: g.lockedDirection, progress, isDragging: true });
      }
    } else if (!hand.isSwiping && g.lockedDirection) {
      const dir = g.lockedDirection;
      const lastProgress = g.lastSwipeDelta;
      g.lockedDirection = null;
      g.lastSwipeDelta = 0;
      releaseFlip(dir, lastProgress);
    }
  }, [hand?.isSwiping, hand?.swipeDelta, gestureActive, currentSpread, totalSpreads, releaseFlip]);

  useEffect(() => {
    if (!hand?.isSwiping) {
      gestureRef.current.lockedDirection = null;
      gestureRef.current.lastSwipeDelta = 0;
    }
  }, [hand?.isSwiping]);

  /* ── Compute flip visuals ── */
  const flipProgress = flip?.progress ?? 0;
  const flipDirection = flip?.direction ?? 'next';
  const isFlipping = flip !== null;

  const flipAngle = flipDirection === 'next'
    ? flipProgress * 180
    : 180 - (1 - flipProgress) * 180;

  const sinAngle = Math.sin((flipAngle * Math.PI) / 180);
  const curlFactor = Math.sin(flipProgress * Math.PI);
  const si = ft.shadowIntensity;

  // Paper curl skew — peaks at 90°
  const skewDeg = Math.sin((flipAngle * Math.PI) / 180) * 4;

  const sharedPageProps = {
    ft, rt, pdfAvailable,
    bookId: book.id,
    pdfUrl: book.pdfUrl,
    totalPages,
    book,
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: ft.ambientBackground }}
    >
      {/* Header */}
      <div className="max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {!hideClose && (
            <button
              onClick={() => navigate('/')}
              className="p-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex-shrink-0"
              style={{ background: ft.pageBackground, color: rt.headerText }}
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate" style={{ color: rt.headerText }}>
              {book.title}
            </h1>
            <p className="text-sm truncate" style={{ color: rt.metaColor }}>{book.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Theme picker toggle */}
          <button
            onClick={() => setShowThemePicker(v => !v)}
            className="p-2.5 rounded-xl shadow transition-all hover:scale-105 active:scale-95 text-xs font-bold"
            style={{ background: ft.pageBackground, color: rt.metaColor }}
            title="Change theme"
          >
            Aa
          </button>

          {/* Share button */}
          {onShareClick && (
            <button
              onClick={onShareClick}
              className="p-2.5 rounded-xl shadow transition-all hover:scale-105 active:scale-95"
              style={{ background: ft.pageBackground, color: rt.titleAccent }}
              title="Share or embed this book"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* Page counter */}
          <div
            className="px-3 py-2 rounded-xl shadow text-sm font-medium"
            style={{ background: ft.pageBackground, color: rt.metaColor }}
          >
            {leftPageNum}–{Math.min(rightPageNum, totalPages)} / {totalPages}
          </div>
        </div>
      </div>

      {/* Theme picker panel */}
      {showThemePicker && (
        <div
          className="mx-auto mb-2 px-5 py-4 rounded-2xl shadow-xl flex flex-wrap gap-5 items-center"
          style={{ background: ft.pageBackground, maxWidth: 600 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: rt.metaColor }}>Page</span>
            <div className="flex gap-1.5">
              {(Object.keys(flipThemes) as FlipTheme[]).map(key => {
                const t = flipThemes[key];
                return (
                  <button
                    key={key}
                    title={t.name}
                    onClick={() => chooseFlipTheme(key)}
                    className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110"
                    style={{
                      background: t.swatch,
                      borderColor: activeFlipTheme === key ? rt.titleAccent : 'transparent',
                      boxShadow: activeFlipTheme === key ? `0 0 0 2px ${rt.titleAccent}33` : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                    }}
                  />
                );
              })}
            </div>
          </div>
          <div className="w-px h-6 bg-current opacity-10" style={{ color: rt.metaColor }} />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: rt.metaColor }}>Text</span>
            <div className="flex gap-1.5">
              {(Object.keys(readerThemes) as ReaderTheme[]).map(key => {
                const t = readerThemes[key];
                return (
                  <button
                    key={key}
                    title={t.name}
                    onClick={() => chooseReaderTheme(key)}
                    className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: t.pageBackground,
                      color: t.textColor,
                      borderColor: activeReaderTheme === key ? rt.titleAccent : 'transparent',
                      boxShadow: activeReaderTheme === key ? `0 0 0 2px ${rt.titleAccent}33` : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                    }}
                  >
                    Aa
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Book area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8 select-none" ref={bookAreaRef}>
        <div className="relative flex items-center gap-5">
          {/* Prev button */}
          <button
            onClick={() => autoFlip('prev')}
            disabled={currentSpread === 0 || isFlipping}
            className="p-4 rounded-full shadow-xl hover:shadow-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 active:scale-95 z-20"
            style={{ background: ft.pageBackground }}
          >
            <ChevronLeft className="w-6 h-6" style={{ color: rt.titleAccent }} />
          </button>

          {/* The Book */}
          <div className="relative" style={{ perspective: '2400px', perspectiveOrigin: '50% 50%' }}>
            <div className="flex" style={{ transformStyle: 'preserve-3d' }}>

              {/* ── LEFT PAGE ── */}
              <div
                className="relative overflow-hidden rounded-l-lg"
                style={{
                  width: PAGE_WIDTH,
                  height: PAGE_HEIGHT,
                  boxShadow: ft.bookShadowBox,
                  cursor: currentSpread > 0 ? 'grab' : 'default',
                  background: ft.pageBackground,
                }}
                onMouseDown={(e) => startPageDrag(e, 'prev')}
              >
                {isFlipping && flipDirection === 'prev' ? (
                  <PageContent {...sharedPageProps} imageDataUrl={prevLeftPage.dataUrl} loading={prevLeftPage.loading} pageNum={leftPageNum - 2} side="left" />
                ) : (
                  <PageContent {...sharedPageProps} imageDataUrl={leftPage.dataUrl} loading={leftPage.loading} pageNum={leftPageNum} side="left" />
                )}
                {/* Gutter shadow — deepens during flip */}
                <div className="absolute right-0 top-0 bottom-0 w-14 pointer-events-none"
                  style={{ background: `linear-gradient(to left, ${themeRgba(ft.gutterShadowRgb, 0.12 + 0.06 * sinAngle)} 0%, ${themeRgba(ft.gutterShadowRgb, 0.04)} 40%, transparent 100%)` }}
                />
                {ft.paperTexture && (
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: PAPER_TEXTURE, opacity: ft.paperTextureOpacity }} />
                )}
              </div>

              {/* ── Spine ── */}
              <div className="w-2 flex-shrink-0" style={{ background: ft.spineGradient, boxShadow: `inset 0 0 6px ${themeRgba(ft.shadowRgb, 0.2 * si)}` }} />

              {/* ── RIGHT PAGE ── */}
              <div
                className="relative overflow-hidden rounded-r-lg"
                style={{
                  width: PAGE_WIDTH,
                  height: PAGE_HEIGHT,
                  boxShadow: ft.bookShadowBox,
                  cursor: currentSpread < totalSpreads - 1 ? 'grab' : 'default',
                  background: ft.pageBackground,
                }}
                onMouseDown={(e) => startPageDrag(e, 'next')}
              >
                {isFlipping && flipDirection === 'next' ? (
                  <PageContent {...sharedPageProps} imageDataUrl={nextRightPage.dataUrl} loading={nextRightPage.loading} pageNum={rightPageNum + 2} side="right" />
                ) : isFlipping && flipDirection === 'prev' ? (
                  <PageContent {...sharedPageProps} imageDataUrl={rightPage.dataUrl} loading={rightPage.loading} pageNum={rightPageNum} side="right" />
                ) : (
                  <PageContent {...sharedPageProps} imageDataUrl={rightPage.dataUrl} loading={rightPage.loading} pageNum={rightPageNum} side="right" />
                )}
                {/* Gutter shadow */}
                <div className="absolute left-0 top-0 bottom-0 w-14 pointer-events-none"
                  style={{ background: `linear-gradient(to right, ${themeRgba(ft.gutterShadowRgb, 0.12 + 0.06 * sinAngle)} 0%, ${themeRgba(ft.gutterShadowRgb, 0.04)} 40%, transparent 100%)` }}
                />
                {ft.paperTexture && (
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: PAPER_TEXTURE, opacity: ft.paperTextureOpacity }} />
                )}
              </div>

              {/* ══════════════ FLIPPING PAGE ══════════════ */}
              {isFlipping && (
                <>
                  {/* Layer A: broad ambient shadow */}
                  <div
                    className="absolute top-2 pointer-events-none rounded-lg"
                    style={{
                      left: flipDirection === 'next' ? PAGE_WIDTH + 2 : 0,
                      width: PAGE_WIDTH,
                      height: PAGE_HEIGHT,
                      transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
                      transform: flipDirection === 'next'
                        ? `rotateY(-${flipAngle}deg) translateZ(-4px)`
                        : `rotateY(${180 - flipAngle}deg) translateZ(-4px)`,
                      boxShadow: `0 0 ${50 * sinAngle}px ${20 * sinAngle}px ${themeRgba(ft.shadowRgb, 0.25 * si * sinAngle)}`,
                      zIndex: 27,
                    }}
                  />

                  {/* The flipping page */}
                  <div
                    className="absolute top-0"
                    style={{
                      left: flipDirection === 'next' ? PAGE_WIDTH + 2 : 0,
                      width: PAGE_WIDTH,
                      height: PAGE_HEIGHT,
                      transformStyle: 'preserve-3d',
                      transformOrigin: flipDirection === 'next' ? 'left center' : 'right center',
                      transform: flipDirection === 'next'
                        ? `rotateY(-${flipAngle}deg) skewY(${skewDeg}deg)`
                        : `rotateY(${180 - flipAngle}deg) skewY(${-skewDeg}deg)`,
                      zIndex: 30,
                    }}
                  >
                    {/* Front face */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        background: ft.pageBackground,
                        borderRadius: flipDirection === 'next' ? '0 8px 8px 0' : '8px 0 0 8px',
                      }}
                    >
                      {flipDirection === 'next' ? (
                        <PageContent {...sharedPageProps} imageDataUrl={rightPage.dataUrl} loading={rightPage.loading} pageNum={rightPageNum} side="right" />
                      ) : (
                        <PageContent {...sharedPageProps} imageDataUrl={leftPage.dataUrl} loading={leftPage.loading} pageNum={leftPageNum} side="left" />
                      )}
                      {ft.paperTexture && (
                        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: PAPER_TEXTURE, opacity: ft.paperTextureOpacity }} />
                      )}
                      {/* Trailing edge shadow */}
                      <div className="absolute inset-0 pointer-events-none" style={{
                        background: flipDirection === 'next'
                          ? `linear-gradient(to left, ${themeRgba(ft.shadowRgb, 0.3 * si * sinAngle)} 0%, ${themeRgba(ft.shadowRgb, 0.1 * si * sinAngle)} 20%, transparent 55%)`
                          : `linear-gradient(to right, ${themeRgba(ft.shadowRgb, 0.3 * si * sinAngle)} 0%, ${themeRgba(ft.shadowRgb, 0.1 * si * sinAngle)} 20%, transparent 55%)`,
                      }} />
                      {/* Specular highlight */}
                      {curlFactor > 0.12 && (
                        <div className="absolute top-0 bottom-0 pointer-events-none" style={{
                          width: 36,
                          left: flipDirection === 'next' ? `${82 - flipProgress * 65}%` : `${18 + flipProgress * 65}%`,
                          background: `linear-gradient(to ${flipDirection === 'next' ? 'right' : 'left'}, transparent, ${themeRgba(ft.highlightRgb, 0.18 * curlFactor)}, transparent)`,
                        }} />
                      )}
                      {/* Fold crease */}
                      <div className="absolute top-0 bottom-0 pointer-events-none" style={{
                        width: 1.5,
                        left: flipDirection === 'next' ? 0 : undefined,
                        right: flipDirection === 'prev' ? 0 : undefined,
                        background: themeRgba(ft.foldCreaseRgb, 0.15 * sinAngle),
                        boxShadow: `0 0 4px ${themeRgba(ft.foldCreaseRgb, 0.1 * sinAngle)}`,
                      }} />
                    </div>

                    {/* Back face */}
                    <div
                      className="absolute inset-0 overflow-hidden"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: ft.pageBackgroundBack,
                        borderRadius: flipDirection === 'next' ? '8px 0 0 8px' : '0 8px 8px 0',
                      }}
                    >
                      {flipDirection === 'next' ? (
                        <PageContent {...sharedPageProps} imageDataUrl={nextLeftPage.dataUrl} loading={nextLeftPage.loading} pageNum={rightPageNum + 1} side="left" />
                      ) : (
                        <PageContent {...sharedPageProps} imageDataUrl={prevRightPage.dataUrl} loading={prevRightPage.loading} pageNum={leftPageNum - 1} side="right" />
                      )}
                      {ft.paperTexture && (
                        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: PAPER_TEXTURE, opacity: ft.paperTextureOpacity }} />
                      )}
                      {/* Revealed-face shadow */}
                      <div className="absolute inset-0 pointer-events-none" style={{
                        background: flipDirection === 'next'
                          ? `linear-gradient(to right, ${themeRgba(ft.shadowRgb, 0.3 * si * sinAngle)} 0%, ${themeRgba(ft.shadowRgb, 0.08 * si * sinAngle)} 28%, transparent 60%)`
                          : `linear-gradient(to left, ${themeRgba(ft.shadowRgb, 0.3 * si * sinAngle)} 0%, ${themeRgba(ft.shadowRgb, 0.08 * si * sinAngle)} 28%, transparent 60%)`,
                      }} />
                      {/* Fold crease back */}
                      <div className="absolute top-0 bottom-0 pointer-events-none" style={{
                        width: 1.5,
                        right: flipDirection === 'next' ? 0 : undefined,
                        left: flipDirection === 'prev' ? 0 : undefined,
                        background: themeRgba(ft.foldCreaseRgb, 0.12 * sinAngle),
                      }} />
                    </div>
                  </div>

                  {/* Layer B: tight fold shadow cast onto underlying page */}
                  <div
                    className="absolute top-0 pointer-events-none"
                    style={{
                      left: flipDirection === 'next' ? PAGE_WIDTH + 2 : 0,
                      width: PAGE_WIDTH,
                      height: PAGE_HEIGHT,
                      zIndex: 29,
                      background: flipDirection === 'next'
                        ? `linear-gradient(to right, ${themeRgba(ft.shadowRgb, 0.18 * si * sinAngle)} 0%, transparent ${Math.max(4, 28 * sinAngle)}%)`
                        : `linear-gradient(to left, ${themeRgba(ft.shadowRgb, 0.18 * si * sinAngle)} 0%, transparent ${Math.max(4, 28 * sinAngle)}%)`,
                    }}
                  />

                  {/* Corner curl tip (appears when page is well past mid-flip) */}
                  {curlFactor > 0.55 && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        bottom: 8,
                        left: flipDirection === 'next' ? PAGE_WIDTH + 2 : undefined,
                        right: flipDirection === 'prev' ? 0 : undefined,
                        width: 28,
                        height: 28,
                        zIndex: 31,
                        background: `linear-gradient(${flipDirection === 'next' ? '315deg' : '225deg'}, ${ft.cornerPeelColor} 50%, transparent 50%)`,
                        borderRadius: '0 0 4px 0',
                        boxShadow: `${flipDirection === 'next' ? '-2px' : '2px'} -2px 4px ${themeRgba(ft.shadowRgb, 0.1)}`,
                        opacity: (curlFactor - 0.55) * 2.5,
                      }}
                    />
                  )}
                </>
              )}
            </div>

            {/* Drag hint corners */}
            {!isFlipping && (
              <>
                {currentSpread < totalSpreads - 1 && (
                  <div
                    className="absolute top-0 right-0 w-16 h-full z-10 cursor-grab"
                    style={{ background: `linear-gradient(to left, ${themeRgba(ft.shadowRgb, 0.03)}, transparent)` }}
                    onMouseDown={(e) => startPageDrag(e, 'next')}
                  >
                    <div className="absolute bottom-4 right-2 w-8 h-8 opacity-30 hover:opacity-60 transition-opacity"
                      style={{ background: `linear-gradient(315deg, ${ft.cornerPeelColor} 50%, transparent 50%)`, borderRadius: '0 0 4px 0', boxShadow: '-2px -2px 4px rgba(0,0,0,0.05)' }}
                    />
                  </div>
                )}
                {currentSpread > 0 && (
                  <div
                    className="absolute top-0 left-0 w-16 h-full z-10 cursor-grab"
                    style={{ background: `linear-gradient(to right, ${themeRgba(ft.shadowRgb, 0.03)}, transparent)` }}
                    onMouseDown={(e) => startPageDrag(e, 'prev')}
                  >
                    <div className="absolute bottom-4 left-2 w-8 h-8 opacity-30 hover:opacity-60 transition-opacity"
                      style={{ background: `linear-gradient(45deg, ${ft.cornerPeelColor} 50%, transparent 50%)`, borderRadius: '0 0 0 4px', boxShadow: '2px -2px 4px rgba(0,0,0,0.05)' }}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Next button */}
          <button
            onClick={() => autoFlip('next')}
            disabled={currentSpread >= totalSpreads - 1 || isFlipping}
            className="p-4 rounded-full shadow-xl hover:shadow-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 active:scale-95 z-20"
            style={{ background: ft.pageBackground }}
          >
            <ChevronRight className="w-6 h-6" style={{ color: rt.titleAccent }} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto w-full px-6 pb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs w-8 text-right" style={{ color: rt.metaColor }}>{leftPageNum}</span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: themeRgba(ft.shadowRgb, 0.1) }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((currentSpread + 1) / totalSpreads) * 100}%`,
                background: `linear-gradient(to right, ${rt.titleAccent}, ${rt.metaColor})`,
              }}
            />
          </div>
          <span className="text-xs w-8" style={{ color: rt.metaColor }}>{totalPages}</span>
        </div>
      </div>

      {/* Gesture hint */}
      {gestureActive && !isFlipping && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs text-white/70"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
        >
          Hold Shift + sweep mouse to flip pages
        </div>
      )}
    </div>
  );
}

/* ─── Main BookReader (used inside AppLayout) ─── */
export function BookReader() {
  const { books, setBooks, updateBook } = useAppContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const book = books.find(b => b.id === id);
  const [shareOpen, setShareOpen] = useState(false);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] dark:bg-[#0A1628]">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-[#0F6FFF] mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-[#1A2332] dark:text-[#F1F5F9] mb-4">Book not found</h2>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-gradient-to-r from-[#0F6FFF] to-[#0EA5E9] text-white rounded-xl">
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <BookReaderCore
        book={book}
        onShareClick={() => setShareOpen(true)}
        onThemeChange={(themes) => updateBook({ ...book, ...themes })}
      />
      {shareOpen && (
        <ShareModal book={book} setBooks={setBooks} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}

/* ─── Share Modal ─── */

interface ShareModalProps {
  book: Book;
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  onClose: () => void;
}

function ShareModal({ book, setBooks, onClose }: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const shareable = !!book.shareId;
  const shareId = book.shareId ?? book.id;
  const shareUrl = buildShareUrl(shareId);
  const embedCode = buildEmbedCode(shareId);

  const copy = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleEnableSharing = async () => {
    setUploading(true);
    setUploadError(null);
    try {
      // Ensure the PDF is in cloud storage (it normally is from upload time).
      if (!book.pdfUrl) {
        const buf = await getPdfAsync(book.id, book.pdfUrl);
        if (!buf) {
          setUploadError('PDF not found. Please re-add the book.');
          setUploading(false);
          return;
        }
        const pdfUrl = await uploadPdfToCloud(book.id, buf);
        if (!pdfUrl) {
          setUploadError('Upload failed. Please try again.');
          setUploading(false);
          return;
        }
        setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, hasPdf: true, pdfUrl } : b)));
      }

      // Publish the public share record.
      const newShareId = await shareBook(book.id);
      if (!newShareId) {
        setUploadError('Could not publish share. Please try again.');
        setUploading(false);
        return;
      }
      setBooks(prev => prev.map(b => (b.id === book.id ? { ...b, shareId: newShareId } : b)));
    } catch (e) {
      setUploadError(`Error: ${e}`);
    }
    setUploading(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-white dark:bg-[#1A2332] rounded-2xl shadow-2xl w-full max-w-lg border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#0F6FFF]/10 dark:border-[#3B82F6]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] flex items-center justify-center">
                <Share2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1A2332] dark:text-[#F1F5F9]">Share "{book.title}"</h3>
                <p className="text-xs text-[#64748B]">Share a link or embed on your site</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-colors">
              <X className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {!shareable ? (
              /* Not yet uploaded */
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] dark:bg-[#451A03] flex items-center justify-center mx-auto">
                  <UploadIcon className="w-7 h-7 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="font-medium text-[#1A2332] dark:text-[#F1F5F9]">Upload to enable sharing</p>
                  <p className="text-sm text-[#64748B] mt-1">Your PDF will be stored in the cloud so anyone can read it via a link.</p>
                </div>
                {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
                <button
                  onClick={handleEnableSharing}
                  disabled={uploading || !book.hasPdf}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#0F6FFF] to-[#0EA5E9] text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {uploading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading…</> : 'Upload & Enable Sharing'}
                </button>
                {!book.hasPdf && <p className="text-xs text-[#94A3B8]">No PDF attached to this book.</p>}
              </div>
            ) : (
              <>
                {/* Share link */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-[#0F6FFF]" />
                    <span className="text-sm font-semibold text-[#1A2332] dark:text-[#F1F5F9]">Share link</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 text-sm px-3 py-2.5 bg-[#F8FAFB] dark:bg-[#0A1628] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl text-[#334155] dark:text-[#94A3B8] font-mono"
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => copy(shareUrl, setCopiedLink)}
                      className="px-4 py-2.5 bg-[#0F6FFF] text-white rounded-xl text-sm font-medium hover:bg-[#0A5FE8] transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-[#0F6FFF] hover:underline w-fit">
                    <ExternalLink className="w-3 h-3" /> Open in new tab
                  </a>
                </div>

                {/* Embed code */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 className="w-4 h-4 text-[#8B5CF6]" />
                    <span className="text-sm font-semibold text-[#1A2332] dark:text-[#F1F5F9]">Embed on your site</span>
                  </div>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={embedCode}
                      rows={3}
                      className="w-full text-xs px-3 py-2.5 bg-[#F8FAFB] dark:bg-[#0A1628] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl text-[#334155] dark:text-[#94A3B8] font-mono resize-none"
                      onClick={e => (e.target as HTMLTextAreaElement).select()}
                    />
                    <button
                      onClick={() => copy(embedCode, setCopiedEmbed)}
                      className="absolute top-2 right-2 px-3 py-1.5 bg-[#8B5CF6] text-white rounded-lg text-xs font-medium hover:bg-[#7C3AED] transition-colors flex items-center gap-1"
                    >
                      {copiedEmbed ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedEmbed ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-[#94A3B8]">Paste this HTML into any webpage to embed the interactive reader.</p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Page Content Component ─── */
interface PageContentProps {
  ft: FlipThemeConfig;
  rt: ReaderThemeConfig;
  pdfAvailable: boolean;
  bookId: string;
  pdfUrl?: string;
  imageDataUrl: string | null;
  loading: boolean;
  pageNum: number;
  totalPages: number;
  book: { title: string; author: string; pages: number; totalPdfPages?: number };
  side: 'left' | 'right';
}

function PageContent({ ft, rt, pdfAvailable, imageDataUrl, loading, pageNum, totalPages, book, side }: PageContentProps) {
  if (pageNum < 1 || pageNum > totalPages) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: ft.pageBackground }}>
        <p className="text-sm italic" style={{ color: rt.metaColor }}>End of book</p>
      </div>
    );
  }

  if (pdfAvailable) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: ft.pageBackground }}>
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: `${rt.metaColor}30`, borderTopColor: rt.titleAccent }} />
            <span className="text-xs" style={{ color: rt.metaColor }}>Loading page {pageNum}…</span>
          </div>
        ) : imageDataUrl ? (
          <img src={imageDataUrl} alt={`Page ${pageNum}`} className="max-w-full max-h-full object-contain" />
        ) : (
          <p className="text-sm italic" style={{ color: rt.metaColor }}>Page {pageNum}</p>
        )}
        <div className={`absolute bottom-4 ${side === 'left' ? 'left-6' : 'right-6'} text-xs`} style={{ color: rt.metaColor }}>
          {pageNum}
        </div>
      </div>
    );
  }

  // Placeholder content
  return (
    <div className="absolute inset-0 p-10" style={{ background: ft.pageBackground }}>
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 27px, ${rt.ruledLineColor} 27px, ${rt.ruledLineColor} 28px)`,
        backgroundPosition: '0 60px',
      }} />
      <div className="relative z-10">
        {pageNum === 1 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-0.5 mb-8" style={{ background: `${rt.titleAccent}50` }} />
            <h2 className="text-2xl font-bold mb-3 leading-tight" style={{ color: rt.textColor }}>{book.title}</h2>
            <p className="text-sm mb-8" style={{ color: rt.metaColor }}>{book.author}</p>
            <div className="w-16 h-0.5" style={{ background: `${rt.titleAccent}50` }} />
            <p className="text-xs mt-8 italic" style={{ color: rt.metaColor }}>AirBooks Edition</p>
          </div>
        ) : (
          <>
            <div className={`text-xs mb-6 ${side === 'left' ? 'text-left' : 'text-right'}`} style={{ color: rt.metaColor }}>
              {book.title} &mdash; {book.author}
            </div>
            <div className="space-y-4 text-sm leading-[1.8]" style={{ color: rt.textColor }}>
              {generatePlaceholderText(pageNum, book.title).map((para, i) => (
                <p key={i} className="indent-8">{para}</p>
              ))}
            </div>
          </>
        )}
      </div>
      <div className={`absolute bottom-5 ${side === 'left' ? 'left-8' : 'right-8'} text-xs`} style={{ color: rt.metaColor }}>
        {pageNum}
      </div>
    </div>
  );
}

function generatePlaceholderText(pageNum: number, title: string): string[] {
  const paragraphs = [
    [
      `The story continues to unfold across these pages, each chapter revealing new depths to the narrative of "${title}."`,
      `Characters emerge with vivid clarity, their voices rising from the paper like old friends returning after a long absence.`,
      `The prose carries a weight that settles into the reader's mind, leaving impressions that linger long after the page has turned.`,
    ],
    [
      `In this passage, the author weaves together themes of discovery and transformation with remarkable precision.`,
      `Every sentence has been crafted with intention, building toward a revelation that promises to reshape everything the reader thought they understood.`,
      `The narrative moves with purpose, each paragraph a stepping stone across the river of the story.`,
    ],
    [
      `Here the writing takes on a contemplative quality, inviting the reader to pause and reflect on what has come before.`,
      `The beauty of the language lies not in its complexity but in its simplicity — each word chosen for its clarity and resonance.`,
      `As the pages accumulate, a portrait begins to form, rich in detail and texture, alive with meaning.`,
    ],
    [
      `This section opens a window into the heart of the work, revealing the mechanisms that drive the story forward.`,
      `The reader finds themselves drawn deeper, compelled by a curiosity that grows with each turned page.`,
      `What began as a simple premise has blossomed into something far more complex and rewarding.`,
    ],
  ];
  return paragraphs[(pageNum - 1) % paragraphs.length];
}
