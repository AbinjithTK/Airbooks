import { Book } from '../types';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { BookOpen, FileText, Eye, Info, Plus, Trash2 } from 'lucide-react';
import { hasPdf } from '../pdf-store';
import { useState } from 'react';

interface BookShelfProps {
  books: Book[];
  onAddBook?: () => void;
  onRequestDelete?: (book: Book) => void;
}

export function BookShelf({ books, onAddBook, onRequestDelete }: BookShelfProps) {
  const navigate = useNavigate();

  // Build items: add-card first, then books
  type ShelfItem = { type: 'add' } | { type: 'book'; book: Book };
  const items: ShelfItem[] = [
    ...(onAddBook ? [{ type: 'add' as const }] : []),
    ...books.map(book => ({ type: 'book' as const, book })),
  ];

  // Group into shelves of 4
  const shelves: ShelfItem[][] = [];
  for (let i = 0; i < items.length; i += 4) {
    shelves.push(items.slice(i, i + 4));
  }

  return (
    <div className="space-y-4">
      {shelves.map((shelf, shelfIndex) => (
        <div key={shelfIndex} className="relative">
          {/* Items row — sit ON the shelf */}
          <div className="grid grid-cols-4 gap-8 px-10 pb-0 relative z-10">
            {shelf.map((item, index) =>
              item.type === 'add' ? (
                <AddBookCard key="__add__" index={index} shelfIndex={shelfIndex} onClick={onAddBook!} />
              ) : (
                <BookCard
                  key={item.book.id}
                  book={item.book}
                  index={index}
                  shelfIndex={shelfIndex}
                  onOpen={(id) => navigate(`/read/${id}`)}
                  onRequestDelete={onRequestDelete}
                />
              )
            )}
          </div>

          {/* ── 3D Protruding Shelf ── */}
          <Shelf3D />
        </div>
      ))}

      {books.length === 0 && !onAddBook && (
        <div className="text-center py-32">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#0F6FFF]/20 to-[#0EA5E9]/20 rounded-3xl flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-[#0F6FFF] dark:text-[#3B82F6]" />
          </div>
          <h3 className="text-2xl font-semibold text-[#1A2332] dark:text-[#F1F5F9] mb-2">
            Your library is empty
          </h3>
          <p className="text-[#64748B] dark:text-[#94A3B8]">
            Add your first book to get started
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   3D Shelf Component
   ───────────────────────────────────────────── */
function Shelf3D() {
  return (
    <div className="relative" style={{ height: 48, perspective: '600px' }}>
      {/* ── Top surface (the platform books rest on) ── */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: 14,
          background: 'linear-gradient(180deg, #C4A882 0%, #B09570 30%, #9E8362 100%)',
          borderRadius: '2px 2px 0 0',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.1)',
        }}
      >
        {/* Wood grain on top */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                87deg,
                transparent,
                transparent 8px,
                rgba(90,60,30,0.3) 8px,
                rgba(90,60,30,0.15) 9px,
                transparent 9px,
                transparent 20px,
                rgba(90,60,30,0.2) 20px,
                rgba(90,60,30,0.1) 21px
              )
            `,
          }}
        />
        {/* Subtle highlight line along front edge */}
        <div
          className="absolute left-0 right-0 bottom-0 h-[1px]"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        />
      </div>

      {/* ── Front face (vertical drop — the protruding part) ── */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: 14,
          height: 22,
          background: 'linear-gradient(180deg, #8B7355 0%, #7A6347 25%, #6B5740 60%, #5A4A35 100%)',
          borderRadius: '0 0 4px 4px',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.15),
            0 4px 8px -2px rgba(60,40,20,0.35),
            0 8px 20px -4px rgba(60,40,20,0.2)
          `,
        }}
      >
        {/* Wood grain on front */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none rounded-b"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 12px,
                rgba(0,0,0,0.15) 12px,
                rgba(0,0,0,0.08) 13px,
                transparent 13px,
                transparent 28px,
                rgba(0,0,0,0.12) 28px,
                rgba(0,0,0,0.05) 29px
              )
            `,
          }}
        />
        {/* Knot detail */}
        <div
          className="absolute opacity-[0.06] rounded-full pointer-events-none"
          style={{
            width: 18,
            height: 10,
            left: '30%',
            top: 6,
            background: 'radial-gradient(ellipse, rgba(60,30,0,0.5) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute opacity-[0.04] rounded-full pointer-events-none"
          style={{
            width: 14,
            height: 8,
            left: '72%',
            top: 8,
            background: 'radial-gradient(ellipse, rgba(60,30,0,0.5) 0%, transparent 70%)',
          }}
        />

        {/* Bottom edge bevel */}
        <div
          className="absolute left-1 right-1 bottom-0 h-[1px] rounded-b"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />
      </div>

      {/* ── Shelf bracket / support hints (left & right) ── */}
      <div
        className="absolute"
        style={{
          left: 24,
          top: 14,
          width: 8,
          height: 22,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.08) 0%, transparent 100%)',
        }}
      />
      <div
        className="absolute"
        style={{
          right: 24,
          top: 14,
          width: 8,
          height: 22,
          background: 'linear-gradient(-90deg, rgba(0,0,0,0.08) 0%, transparent 100%)',
        }}
      />

      {/* ── Shadow cast below the shelf ── */}
      <div
        className="absolute left-4 right-4"
        style={{
          top: 36,
          height: 18,
          background: 'radial-gradient(ellipse 90% 100% at 50% 0%, rgba(40,25,10,0.25) 0%, rgba(40,25,10,0.08) 50%, transparent 100%)',
          filter: 'blur(4px)',
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Add Book Card Component
   ───────────────────────────────────────────── */
interface AddBookCardProps {
  index: number;
  shelfIndex: number;
  onClick: () => void;
}

function AddBookCard({ index, shelfIndex, onClick }: AddBookCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: shelfIndex * 0.15 + index * 0.08,
        duration: 0.5,
        ease: [0.25, 0.8, 0.25, 1],
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={onClick}
    >
      <motion.div
        animate={{
          y: hovered ? -18 : 0,
          scale: hovered ? 1.04 : 1,
        }}
        transition={{
          duration: 0.4,
          ease: [0.25, 0.8, 0.25, 1],
        }}
        className="relative"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* ── Grounding shadow ── */}
        <motion.div
          className="absolute left-1/2 bottom-0 -translate-x-1/2 pointer-events-none"
          animate={{
            width: hovered ? '92%' : '80%',
            height: hovered ? 14 : 6,
            opacity: hovered ? 0.2 : 0.4,
            filter: hovered ? 'blur(10px)' : 'blur(4px)',
            y: hovered ? 20 : 2,
          }}
          transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
          style={{
            background: 'radial-gradient(ellipse, rgba(30,15,0,0.8) 0%, transparent 70%)',
            transformOrigin: 'bottom center',
          }}
        />

        {/* ── Card body ── */}
        <div
          className="relative overflow-visible"
          style={{ aspectRatio: '4/5', transformStyle: 'preserve-3d' }}
        >
          {/* Spine */}
          <div
            className="absolute left-0 top-0 bottom-0 z-0"
            style={{
              width: 16,
              background: 'linear-gradient(90deg, #5A4A35 0%, #6B5740 40%, #7A6347 100%)',
              transform: 'translateX(-12px) skewY(-2deg)',
              borderRadius: '3px 0 0 3px',
              boxShadow: 'inset -1px 0 2px rgba(0,0,0,0.3), -2px 2px 6px rgba(0,0,0,0.2)',
            }}
          />

          {/* Front face */}
          <div
            className="relative w-full h-full rounded-lg overflow-hidden z-10 flex items-center justify-center"
            style={{
              background: 'linear-gradient(145deg, #9E8A72 0%, #8B7355 50%, #7A6347 100%)',
              boxShadow: hovered
                ? '4px 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset'
                : '2px 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset',
            }}
          >
            {/* Glossy highlight */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 25%, transparent 50%, rgba(0,0,0,0.05) 100%)',
              }}
            />

            {/* Dashed border inset */}
            <div
              className="absolute inset-3 rounded-md pointer-events-none"
              style={{
                border: `2px dashed ${hovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'}`,
                transition: 'border-color 0.3s ease',
              }}
            />

            {/* Plus icon */}
            <motion.div
              animate={{
                scale: hovered ? 1.15 : 1,
              }}
              transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
              className="flex flex-col items-center gap-3"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: hovered
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(255,255,255,0.12)',
                  transition: 'background 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                <Plus className="w-7 h-7 text-white/80" />
              </div>
              <span className="text-[11px] text-white/60 uppercase tracking-widest">
                Add Book
              </span>
            </motion.div>

            {/* Page edges (right side) */}
            <div
              className="absolute right-0 top-2 bottom-2 w-[5px] pointer-events-none"
              style={{
                background: `linear-gradient(90deg, 
                  rgba(255,255,255,0.04) 0%, 
                  rgba(245,240,230,0.6) 20%, 
                  rgba(245,240,230,0.8) 50%, 
                  rgba(235,230,220,0.6) 80%, 
                  rgba(220,215,205,0.4) 100%
                )`,
                borderRadius: '0 2px 2px 0',
              }}
            />
            <div
              className="absolute right-[5px] top-3 bottom-3 w-[2px] pointer-events-none"
              style={{ background: 'rgba(245,240,230,0.25)' }}
            />
          </div>

          {/* Bottom edge */}
          <div
            className="absolute left-0 right-0 bottom-0 z-0"
            style={{
              height: 6,
              background: 'linear-gradient(180deg, #6B5740 0%, #5A4A35 100%)',
              transform: 'translateY(4px)',
              borderRadius: '0 0 4px 4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Book Card Component
   ───────────────────────────────────────────── */
interface BookCardProps {
  book: Book;
  index: number;
  shelfIndex: number;
  onOpen: (id: string) => void;
  onRequestDelete?: (book: Book) => void;
}

function BookCard({ book, index, shelfIndex, onOpen, onRequestDelete }: BookCardProps) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const bookHasPdf = book.hasPdf || hasPdf(book.id);

  const baseColor = book.coverColor;
  const darkColor = adjustBrightness(baseColor, -30);
  const darkerColor = adjustBrightness(baseColor, -50);
  const spineColor = adjustBrightness(baseColor, -40);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: shelfIndex * 0.15 + index * 0.08,
        duration: 0.5,
        ease: [0.25, 0.8, 0.25, 1],
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer"
      style={{ perspective: '1000px' }}
    >
      {/* The whole book wrapper — handles the lift + shadow */}
      <motion.div
        animate={{
          y: hovered ? -18 : 0,
          scale: hovered ? 1.04 : 1,
        }}
        transition={{
          duration: 0.4,
          ease: [0.25, 0.8, 0.25, 1],
        }}
        className="relative"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* ── Grounding shadow (sits below the book) ── */}
        <motion.div
          className="absolute left-1/2 bottom-0 -translate-x-1/2 pointer-events-none"
          animate={{
            width: hovered ? '92%' : '80%',
            height: hovered ? 14 : 6,
            opacity: hovered ? 0.2 : 0.4,
            filter: hovered ? 'blur(10px)' : 'blur(4px)',
            y: hovered ? 20 : 2,
          }}
          transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
          style={{
            background: 'radial-gradient(ellipse, rgba(30,15,0,0.8) 0%, transparent 70%)',
            transformOrigin: 'bottom center',
          }}
        />

        {/* ── Book body (aspect 4:5) ── */}
        <div
          className="relative overflow-visible"
          style={{
            aspectRatio: '4/5',
            transformStyle: 'preserve-3d',
          }}
          onClick={() => onOpen(book.id)}
        >
          {/* Spine (left edge — 3D effect via skew) */}
          <div
            className="absolute left-0 top-0 bottom-0 z-0"
            style={{
              width: 16,
              background: `linear-gradient(90deg, ${darkerColor} 0%, ${spineColor} 40%, ${darkColor} 100%)`,
              transform: 'translateX(-12px) skewY(-2deg)',
              borderRadius: '3px 0 0 3px',
              boxShadow: `inset -1px 0 2px rgba(0,0,0,0.3), -2px 2px 6px rgba(0,0,0,0.2)`,
            }}
          >
            {/* Spine texture lines */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(255,255,255,0.15) 6px, rgba(255,255,255,0.15) 7px)',
              }}
            />
          </div>

          {/* Front cover */}
          <div
            className="relative w-full h-full rounded-lg overflow-hidden z-10"
            style={{
              background: `linear-gradient(145deg, ${baseColor} 0%, ${adjustBrightness(baseColor, -10)} 50%, ${darkColor} 100%)`,
              boxShadow: hovered
                ? `4px 8px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset`
                : `2px 4px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05) inset`,
            }}
          >
            {/* Glossy highlight overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 25%, transparent 50%, rgba(0,0,0,0.05) 100%)',
              }}
            />

            {/* Subtle edge light (top & left) */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px] pointer-events-none"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            />
            <div
              className="absolute top-0 left-0 bottom-0 w-[1px] pointer-events-none"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            />

            {/* Cover content */}
            <div className="absolute inset-0 p-5 flex flex-col justify-between">
              <div>
                {/* Decorative line */}
                <div
                  className="w-10 h-[2px] mb-4 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.3)' }}
                />
                <h3 className="text-white font-bold text-[15px] leading-snug mb-2 drop-shadow-lg">
                  {book.title}
                </h3>
                <p className="text-white/70 text-xs drop-shadow">
                  {book.author}
                </p>
              </div>

              <div className="flex items-end justify-between">
                {/* Category tag */}
                <span className="text-[9px] text-white/50 uppercase tracking-widest">
                  {book.category}
                </span>

                {/* PDF badge */}
                {bookHasPdf && (
                  <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-md px-2 py-0.5">
                    <FileText className="w-3 h-3 text-white/80" />
                    <span className="text-[9px] text-white/80 font-medium">PDF</span>
                  </div>
                )}
              </div>
            </div>

            {/* Page edges (right side) */}
            <div
              className="absolute right-0 top-2 bottom-2 w-[5px] pointer-events-none"
              style={{
                background: `linear-gradient(90deg, 
                  rgba(255,255,255,0.04) 0%, 
                  rgba(245,240,230,0.6) 20%, 
                  rgba(245,240,230,0.8) 50%, 
                  rgba(235,230,220,0.6) 80%, 
                  rgba(220,215,205,0.4) 100%
                )`,
                borderRadius: '0 2px 2px 0',
              }}
            />
            <div
              className="absolute right-[5px] top-3 bottom-3 w-[2px] pointer-events-none"
              style={{
                background: 'rgba(245,240,230,0.25)',
              }}
            />
            <div
              className="absolute right-[7px] top-4 bottom-4 w-[1px] pointer-events-none"
              style={{
                background: 'rgba(245,240,230,0.12)',
              }}
            />

            {/* ── Hover overlay: "Open" & "Details" buttons ── */}
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-end pb-6 gap-2.5 z-20"
              initial={false}
              animate={{
                opacity: hovered ? 1 : 0,
              }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ pointerEvents: hovered ? 'auto' : 'none' }}
            >
              {/* Gradient scrim */}
              <div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.55) 100%)',
                }}
              />

              {/* Open button */}
              <motion.button
                className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium border border-white/30"
                style={{
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
                animate={{
                  y: hovered ? 0 : 12,
                  opacity: hovered ? 1 : 0,
                }}
                transition={{
                  duration: 0.3,
                  delay: hovered ? 0.08 : 0,
                  ease: [0.25, 0.8, 0.25, 1],
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(book.id);
                }}
                whileHover={{ scale: 1.05, background: 'rgba(15,111,255,0.85)' }}
                whileTap={{ scale: 0.97 }}
              >
                <Eye className="w-4 h-4" />
                Open
              </motion.button>

              {/* Details button */}
              <motion.button
                className="relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-white/80 text-xs font-medium border border-white/20"
                style={{
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
                animate={{
                  y: hovered ? 0 : 12,
                  opacity: hovered ? 1 : 0,
                }}
                transition={{
                  duration: 0.3,
                  delay: hovered ? 0.15 : 0,
                  ease: [0.25, 0.8, 0.25, 1],
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Could open a details panel in the future
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <Info className="w-3.5 h-3.5" />
                {book.pages} pages
              </motion.button>

              {/* Delete button */}
              {onRequestDelete && (
                <motion.button
                  className="absolute top-3 right-3 z-10 p-2 rounded-full text-white border border-white/20"
                  style={{
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                  animate={{
                    opacity: hovered ? 1 : 0,
                    scale: hovered ? 1 : 0.8,
                  }}
                  transition={{
                    duration: 0.25,
                    delay: hovered ? 0.05 : 0,
                    ease: [0.25, 0.8, 0.25, 1],
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestDelete(book);
                  }}
                  aria-label={`Delete ${book.title}`}
                  whileHover={{ scale: 1.1, background: 'rgba(220,38,38,0.9)' }}
                  whileTap={{ scale: 0.92 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
          </div>

          {/* Bottom edge (book thickness at bottom) */}
          <div
            className="absolute left-0 right-0 bottom-0 z-0"
            style={{
              height: 6,
              background: `linear-gradient(180deg, ${darkColor} 0%, ${darkerColor} 100%)`,
              transform: 'translateY(4px)',
              borderRadius: '0 0 4px 4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Color helper ─── */
function adjustBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}