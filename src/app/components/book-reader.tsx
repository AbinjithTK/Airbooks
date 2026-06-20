import { useAppContext } from './app-layout';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, X, BookOpen,
  Share2, Copy, Check, Link2, Code2, Upload as UploadIcon, ExternalLink,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { getPdfAsync, evictPdfDocument, hasPdf } from '../pdf-store';
import { useHandTracking } from './hand-tracking-provider';
import { FlipTheme, ReaderTheme, SkyboxTheme, Book } from '../types';
import { flipThemes, FlipThemeConfig } from '../themes/flip-themes';
import { readerThemes, ReaderThemeConfig } from '../themes/reader-themes';
import { ReaderThemePicker } from './reader-theme-picker';
import { useWorld } from '../world/world-provider';
import { BookReader3D } from './book-reader-3d';
import { AnimatePresence, motion } from 'motion/react';
import { buildShareUrl, buildEmbedCode, uploadPdfToCloud, shareBook } from '../supabase-books';
import { FlipBook, FlipBookHandle, PAGE_WIDTH, PAGE_HEIGHT } from './flip-book';
import { SCROLL_DISTANCE, SCROLL_IDLE_MS } from '../book-3d/flip-physics';

import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

/* ─────────────────────────────────────────────────────────────
   BookReaderCore
   ───────────────────────────────────────────────────────────── */

interface BookReaderCoreProps {
  book: Book & { id: string; title: string; author: string };
  pdfBuffer?: ArrayBuffer | null;
  onShareClick?: () => void;
  hideClose?: boolean;
  onThemeChange?: (themes: { flipTheme?: FlipTheme; readerTheme?: ReaderTheme }) => void;
}

export function BookReaderCore({
  book, pdfBuffer, onShareClick, hideClose, onThemeChange,
}: BookReaderCoreProps) {
  const navigate = useNavigate();

  const [activeFlipTheme, setActiveFlipTheme] = useState<FlipTheme>(
    book.flipTheme ?? 'classic',
  );
  const [activeReaderTheme, setActiveReaderTheme] = useState<ReaderTheme>(
    book.readerTheme ?? 'white',
  );
  const [showThemePicker, setShowThemePicker] = useState(false);

  // StPageFlip drives page navigation; we shadow its state here.
  const [currentPage, setCurrentPage] = useState(0); // 0-based left page index
  const [isFlipping, setIsFlipping] = useState(false);

  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const bookAreaRef = useRef<HTMLDivElement>(null);

  const ft = flipThemes[activeFlipTheme];
  const rt = readerThemes[activeReaderTheme];

  // Determine if we have a usable PDF.
  const pdfAvailable = pdfBuffer
    ? true
    : book.hasPdf && (hasPdf(book.id) || !!book.pdfUrl);
  const totalPages = pdfAvailable ? (book.totalPdfPages || book.pages) : book.pages;
  const totalSpreads = Math.ceil(totalPages / 2);

  const leftPageNum = currentPage + 1;   // 1-based
  const rightPageNum = currentPage + 2;

  // If a direct buffer was passed, inject it into the store.
  useEffect(() => {
    if (pdfBuffer) {
      import('../pdf-store').then(({ storePdf }) => storePdf(book.id, pdfBuffer));
    }
    return () => evictPdfDocument(book.id);
  }, [book.id, pdfBuffer]);

  const chooseFlipTheme = (t: FlipTheme) => {
    setActiveFlipTheme(t);
    onThemeChange?.({ flipTheme: t });
  };
  const chooseReaderTheme = (t: ReaderTheme) => {
    setActiveReaderTheme(t);
    onThemeChange?.({ readerTheme: t });
  };

  // Responsive scale-to-fit: keep the book inside its container.
  const [bookScale, setBookScale] = useState(1);
  const scaleRef = useRef(1);
  useEffect(() => {
    const el = bookAreaRef.current;
    if (!el) return;
    const calc = () => {
      const availW = el.clientWidth - 16;
      const availH = el.clientHeight - 16;
      const natW = PAGE_WIDTH * 2 + 150; // book + nav buttons
      const natH = PAGE_HEIGHT;
      const s = Math.max(0.22, Math.min(1, Math.min(availW / natW, availH / natH) * 0.94));
      scaleRef.current = s;
      setBookScale(s);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') flipBookRef.current?.flipNext();
      if (e.key === 'ArrowLeft') flipBookRef.current?.flipPrev();
      if (e.key === 'Escape' && !hideClose) navigate('/');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hideClose, navigate]);

  // ── Trackpad / horizontal-scroll navigation ──
  const scrollRef = useRef({ pool: 0, idle: 0 });
  useEffect(() => {
    const el = bookAreaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const s = scrollRef.current;
      s.pool += e.deltaX;
      if (s.pool > SCROLL_DISTANCE) {
        s.pool = 0;
        flipBookRef.current?.flipNext();
      } else if (s.pool < -SCROLL_DISTANCE) {
        s.pool = 0;
        flipBookRef.current?.flipPrev();
      }
      window.clearTimeout(s.idle);
      s.idle = window.setTimeout(() => { s.pool = 0; }, SCROLL_IDLE_MS);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout(scrollRef.current.idle);
    };
  }, []);

  // ── Hand gesture ──
  const { hand, isActive: gestureActive } = useHandTracking();
  const gestureRef = useRef({ lastFired: 0, lastDelta: 0 });
  useEffect(() => {
    if (!gestureActive || !hand?.isSwiping) return;
    const delta = hand.swipeDelta;
    if (Math.abs(delta) < 0.45) return;
    const now = performance.now();
    if (now - gestureRef.current.lastFired < 800) return; // debounce
    gestureRef.current.lastFired = now;
    if (delta < 0) flipBookRef.current?.flipNext();
    else flipBookRef.current?.flipPrev();
  }, [hand?.isSwiping, hand?.swipeDelta, gestureActive]);

  const progressFraction = totalPages > 1 ? currentPage / (totalPages - 1) : 0;
  const atStart = currentPage <= 0;
  const atEnd = currentPage >= totalPages - 2;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'transparent' }}>

      {/* ── Header ── */}
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
            <h1
              className="text-lg font-bold leading-tight truncate"
              style={{ color: rt.headerText }}
            >
              {book.title}
            </h1>
            <p className="text-sm truncate" style={{ color: rt.metaColor }}>
              {book.author}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowThemePicker(v => !v)}
            className="p-2.5 rounded-xl shadow transition-all hover:scale-105 active:scale-95 text-xs font-bold"
            style={{ background: ft.pageBackground, color: rt.metaColor }}
            title="Change theme"
          >
            Aa
          </button>
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
          <div
            className="px-3 py-2 rounded-xl shadow text-sm font-medium"
            style={{ background: ft.pageBackground, color: rt.metaColor }}
          >
            {leftPageNum}–{Math.min(rightPageNum, totalPages)} / {totalPages}
          </div>
        </div>
      </div>

      {/* ── Theme picker ── */}
      {showThemePicker && (
        <div
          className="mx-auto mb-2 px-5 py-4 rounded-2xl shadow-xl flex flex-wrap gap-5 items-center"
          style={{ background: ft.pageBackground, maxWidth: 600 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: rt.metaColor }}
            >
              Page
            </span>
            <div className="flex gap-1.5">
              {(Object.keys(flipThemes) as FlipTheme[]).map(key => (
                <button
                  key={key}
                  title={flipThemes[key].name}
                  onClick={() => chooseFlipTheme(key)}
                  className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    background: flipThemes[key].swatch,
                    borderColor:
                      activeFlipTheme === key ? rt.titleAccent : 'transparent',
                    boxShadow:
                      activeFlipTheme === key
                        ? `0 0 0 2px ${rt.titleAccent}33`
                        : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                  }}
                />
              ))}
            </div>
          </div>
          <div
            className="w-px h-6 bg-current opacity-10"
            style={{ color: rt.metaColor }}
          />
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: rt.metaColor }}
            >
              Text
            </span>
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
                      borderColor:
                        activeReaderTheme === key ? rt.titleAccent : 'transparent',
                      boxShadow:
                        activeReaderTheme === key
                          ? `0 0 0 2px ${rt.titleAccent}33`
                          : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
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

      {/* ── Book area ── */}
      <div
        ref={bookAreaRef}
        className="flex-1 flex items-center justify-center px-4 pb-8 select-none overflow-hidden"
      >
        <div
          className="relative flex items-center gap-5"
          style={{ transform: `scale(${bookScale})`, transformOrigin: 'center center' }}
        >
          {/* Prev button */}
          <button
            onClick={() => flipBookRef.current?.flipPrev()}
            disabled={atStart || isFlipping}
            className="p-4 rounded-full shadow-xl hover:shadow-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 active:scale-95 z-20"
            style={{ background: ft.pageBackground }}
          >
            <ChevronLeft className="w-6 h-6" style={{ color: rt.titleAccent }} />
          </button>

          {/* StPageFlip book */}
          <div
            className="rounded-lg"
            style={{ boxShadow: ft.bookShadowBox }}
          >
            <FlipBook
              ref={flipBookRef}
              bookId={book.id}
              pdfUrl={book.pdfUrl}
              totalPages={totalPages}
              pdfAvailable={pdfAvailable}
              pageBackground={ft.pageBackground}
              bookCoverColor={book.coverColor}
              bookTitle={book.title}
              onPageChange={idx => setCurrentPage(idx)}
              onStateChange={active => setIsFlipping(active)}
            />
          </div>

          {/* Next button */}
          <button
            onClick={() => flipBookRef.current?.flipNext()}
            disabled={atEnd || isFlipping}
            className="p-4 rounded-full shadow-xl hover:shadow-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 active:scale-95 z-20"
            style={{ background: ft.pageBackground }}
          >
            <ChevronRight className="w-6 h-6" style={{ color: rt.titleAccent }} />
          </button>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="px-8 pb-6">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: `${ft.pageBackground}80` }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressFraction * 100}%`,
              background: `linear-gradient(90deg, ${rt.titleAccent}, ${rt.titleAccent}99)`,
            }}
          />
        </div>
      </div>

      {/* ── Gesture hint ── */}
      {gestureActive && (
        <div
          className="text-center text-xs pb-4"
          style={{ color: rt.metaColor }}
        >
          Swipe left / right to turn pages
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   BookReader — route wrapper (now uses 3D reader)
   ───────────────────────────────────────────────────────────── */

export function BookReader() {
  const { books, setBooks, updateBook } = useAppContext();
  const { id } = useParams();
  const navigate = useNavigate();
  const book = books.find(b => b.id === id);
  const { setActiveSkybox, activeSkybox } = useWorld();
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);

  // Apply the book's skybox theme when opening it
  useEffect(() => {
    if (book?.skyboxTheme) {
      setActiveSkybox(book.skyboxTheme);
    }
    return () => { setActiveSkybox(null); };
  }, [book?.skyboxTheme, setActiveSkybox]);

  // Load PDF buffer
  useEffect(() => {
    if (!book) return;
    getPdfAsync(book.id).then(buf => {
      if (buf) setPdfBuffer(buf);
    });
  }, [book?.id]);

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-[#0F6FFF] mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Book not found</h2>
          <button onClick={() => navigate('/')} className="px-6 py-3 rounded-2xl font-semibold text-white text-sm cursor-pointer" style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
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
        pdfBuffer={pdfBuffer}
        onShareClick={() => {}}
        onThemeChange={themes => updateBook({ ...book, ...themes })}
      />
      <ReaderThemePicker
        bookSkybox={book.skyboxTheme}
        onSelect={(theme: SkyboxTheme) => {
          updateBook({ ...book, skyboxTheme: theme });
          setActiveSkybox(theme);
        }}
      />
    </>
  );
}

/** Load pages for a book — returns array of text strings (one per page) */
async function loadBookPages(book: Book): Promise<string[]> {
  // If book has PDF, try to extract text from it
  if (book.hasPdf) {
    try {
      const buffer = await getPdfAsync(book.id);
      if (buffer) {
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const text = content.items.map((item: any) => item.str).join(' ');
          pages.push(text || `Page ${i}`);
        }
        return pages;
      }
    } catch (e) {
      console.warn('Failed to load PDF pages:', e);
    }
  }
  // Fallback: generate placeholder pages
  const count = book.totalPdfPages || book.pages || 10;
  return Array.from({ length: Math.min(count, 20) }, (_, i) =>
    i === 0 ? `${book.title}\n\nby ${book.author}\n\n${book.category}` : `Page ${i + 1}\n\nContent for this page will appear here when a PDF is uploaded.`
  );
}

/* ─────────────────────────────────────────────────────────────
   ShareModal
   ───────────────────────────────────────────────────────────── */

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
      if (!book.pdfUrl) {
        const buf = await getPdfAsync(book.id, book.pdfUrl);
        if (!buf) { setUploadError('PDF not found. Please re-add the book.'); setUploading(false); return; }
        const pdfUrl = await uploadPdfToCloud(book.id, buf);
        if (!pdfUrl) { setUploadError('Upload failed. Please try again.'); setUploading(false); return; }
        setBooks(prev => prev.map(b => b.id === book.id ? { ...b, hasPdf: true, pdfUrl } : b));
      }
      const newShareId = await shareBook(book.id);
      if (!newShareId) { setUploadError('Could not publish share. Please try again.'); setUploading(false); return; }
      setBooks(prev => prev.map(b => b.id === book.id ? { ...b, shareId: newShareId } : b));
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
          <div className="px-6 py-4 border-b border-[#0F6FFF]/10 dark:border-[#3B82F6]/15 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] flex items-center justify-center">
                <Share2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1A2332] dark:text-[#F1F5F9]">
                  Share &ldquo;{book.title}&rdquo;
                </h3>
                <p className="text-xs text-[#64748B]">Share a link or embed on your site</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-colors"
            >
              <X className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {!shareable ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] dark:bg-[#451A03] flex items-center justify-center mx-auto">
                  <UploadIcon className="w-7 h-7 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="font-medium text-[#1A2332] dark:text-[#F1F5F9]">Upload to enable sharing</p>
                  <p className="text-sm text-[#64748B] mt-1">
                    Your PDF will be stored in the cloud so anyone can read it via a link.
                  </p>
                </div>
                {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
                <button
                  onClick={handleEnableSharing}
                  disabled={uploading || !book.hasPdf}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#0F6FFF] to-[#0EA5E9] text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {uploading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading…</>
                  ) : 'Upload & Enable Sharing'}
                </button>
                {!book.hasPdf && (
                  <p className="text-xs text-[#94A3B8]">No PDF attached to this book.</p>
                )}
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="w-4 h-4 text-[#0F6FFF]" />
                    <span className="text-sm font-semibold text-[#1A2332] dark:text-[#F1F5F9]">Share link</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly value={shareUrl}
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
                  <a
                    href={shareUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-xs text-[#0F6FFF] hover:underline w-fit"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in new tab
                  </a>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 className="w-4 h-4 text-[#8B5CF6]" />
                    <span className="text-sm font-semibold text-[#1A2332] dark:text-[#F1F5F9]">Embed on your site</span>
                  </div>
                  <div className="relative">
                    <textarea
                      readOnly value={embedCode} rows={3}
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
                  <p className="mt-1.5 text-xs text-[#94A3B8]">
                    Paste this HTML into any webpage to embed the interactive reader.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Keep BookReaderCore available for the public share page ────────────────
export { BookReaderCore as BookReaderCoreType };
