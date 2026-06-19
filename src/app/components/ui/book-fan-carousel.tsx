import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, FileText, PenLine } from 'lucide-react';
import gsap from 'gsap';
import { Book } from '../../types';

interface BookFanCarouselProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onAddBook: () => void;
  onWriteBook?: (book: Book) => void;
}

const MAX_VISIBLE = 7;
const HALF = 3;

const FAN_POSITIONS = [
  { rot: -18, scale: 0.75, x: -28, y: 5, zIndex: 1 },
  { rot: -12, scale: 0.84, x: -19, y: 2.8, zIndex: 2 },
  { rot: -6, scale: 0.92, x: -9.5, y: 0.8, zIndex: 3 },
  { rot: 0, scale: 1.0, x: 0, y: 0, zIndex: 10 },
  { rot: 6, scale: 0.92, x: 9.5, y: 0.8, zIndex: 3 },
  { rot: 12, scale: 0.84, x: 19, y: 2.8, zIndex: 2 },
  { rot: 18, scale: 0.75, x: 28, y: 5, zIndex: 1 },
];

function getSlotConfig(totalCards: number, slot: number) {
  if (totalCards >= MAX_VISIBLE) return FAN_POSITIONS[slot];
  const center = totalCards >> 1;
  const distance = totalCards > 1 ? (slot - center) / center : 0;
  const absD = Math.abs(distance);
  return {
    rot: distance * 18,
    scale: 1.0 - 0.25 * absD * absD,
    x: distance * 28,
    y: absD * absD * 5,
    zIndex: 10 - Math.abs(slot - center),
  };
}

function getResponsiveMultiplier(w: number) {
  if (w < 480) return 0.3;
  if (w < 640) return 0.4;
  if (w < 768) return 0.55;
  if (w < 1024) return 0.75;
  return 1.0;
}

export function BookFanCarousel({ books, onOpenBook, onAddBook, onWriteBook }: BookFanCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);
  const hasEntered = useRef(false);
  const directionRef = useRef<'left' | 'right' | null>(null);
  const prevVisible = useRef<Set<number>>(new Set());

  // Add "add card" as first item
  type Item = { type: 'add' } | { type: 'book'; book: Book; idx: number };
  const items: Item[] = [
    { type: 'add' },
    ...books.map((book, idx) => ({ type: 'book' as const, book, idx })),
  ];
  const totalCards = items.length;
  const needsPagination = totalCards > MAX_VISIBLE;
  const [centerIndex, setCenterIndex] = useState(needsPagination ? HALF : totalCards >> 1);

  const getVisibleMap = useCallback((center: number) => {
    const map = new Map<number, number>();
    if (!needsPagination) {
      items.forEach((_, i) => map.set(i, i));
      return map;
    }
    for (let slot = 0; slot < MAX_VISIBLE; slot++) {
      map.set(((center + slot - HALF) % totalCards + totalCards) % totalCards, slot);
    }
    return map;
  }, [totalCards, needsPagination]);

  const cycle = useCallback((dir: 'left' | 'right') => {
    if (isAnimating.current || !needsPagination) return;
    isAnimating.current = true;
    directionRef.current = dir;
    setCenterIndex(prev => dir === 'right' ? (prev + 1) % totalCards : (prev - 1 + totalCards) % totalCards);
  }, [totalCards, needsPagination]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !totalCards) return;
    const cardEls = Array.from(container.querySelectorAll<HTMLElement>('.fan-card'));
    if (!cardEls.length) return;

    const visibleMap = getVisibleMap(centerIndex);
    const prev = prevVisible.current;
    const direction = directionRef.current;
    const isFirst = !hasEntered.current;
    const mult = getResponsiveMultiplier(window.innerWidth);
    const slotCount = needsPagination ? MAX_VISIBLE : totalCards;
    const config = (slot: number) => getSlotConfig(slotCount, slot);

    if (isFirst) isAnimating.current = true;
    let done = 0;
    const onDone = () => { if (++done >= visibleMap.size) { isAnimating.current = false; if (isFirst) hasEntered.current = true; } };

    cardEls.forEach((card, i) => {
      const slot = visibleMap.get(i);
      const was = prev.has(i);
      if (slot !== undefined) {
        const { x, y, rot, scale, zIndex } = config(slot);
        const target = { x: `${x * mult}rem`, y: `${y}rem`, rotation: rot, scale, opacity: 1, zIndex };
        if (isFirst) {
          gsap.set(card, { x: 0, y: '10rem', rotation: 0, scale: 0.4, opacity: 0 });
          gsap.to(card, { ...target, duration: 1, ease: 'elastic.out(1,.8)', delay: 0.15 + slot * 0.06, onComplete: onDone });
        } else if (!was) {
          const eX = direction === 'right' ? 35 : -35;
          gsap.set(card, { x: `${eX}rem`, y: `${y}rem`, rotation: direction === 'right' ? 25 : -25, scale: 0.4, opacity: 0 });
          gsap.to(card, { ...target, duration: 0.5, ease: 'power2.out', onComplete: onDone });
        } else {
          gsap.to(card, { ...target, duration: 0.45, ease: 'power2.out', onComplete: onDone });
        }
      } else if (was) {
        const eX = direction === 'right' ? -35 : 35;
        gsap.to(card, { x: `${eX}rem`, opacity: 0, scale: 0.4, rotation: direction === 'right' ? -25 : 25, duration: 0.35, ease: 'power2.in', zIndex: 0 });
      } else if (isFirst) {
        gsap.set(card, { opacity: 0, scale: 0.3, x: 0, y: 0, zIndex: 0 });
      }
    });
    prevVisible.current = new Set(visibleMap.keys());
  }, [centerIndex, totalCards, getVisibleMap, needsPagination]);

  const chevron = (dir: 'left' | 'right') => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={dir === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  );

  return (
    <section className="flex flex-col items-center w-full py-8 relative">
      {/* Fan container */}
      <div ref={containerRef} className="relative flex justify-center items-center w-full min-h-[22rem] sm:min-h-[26rem] md:min-h-[30rem] lg:min-h-[34rem]">
        {items.map((item, index) => (
          <div
            key={item.type === 'add' ? '__add__' : (item as any).book.id}
            className="fan-card absolute w-[10rem] h-[14rem] sm:w-[12rem] sm:h-[16rem] md:w-[14rem] md:h-[19rem] lg:w-[16rem] lg:h-[22rem] rounded-2xl overflow-hidden cursor-pointer select-none"
            style={{ willChange: 'transform, opacity' }}
            onClick={() => item.type === 'add' ? onAddBook() : onOpenBook((item as any).book)}
          >
            {item.type === 'add' ? (
              <AddCard />
            ) : (
              <BookCard book={(item as any).book} onWrite={onWriteBook ? () => onWriteBook((item as any).book) : undefined} />
            )}
          </div>
        ))}
      </div>

      {/* Pagination arrows */}
      {needsPagination && (
        <div className="flex items-center justify-center gap-5 mt-4 z-30">
          <button onClick={() => cycle('left')} aria-label="Previous" className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'linear-gradient(145deg, rgba(60,40,20,0.9), rgba(25,15,5,0.95))', boxShadow: '0 4px 12px -3px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,200,100,0.08)', border: '1px solid rgba(255,200,100,0.08)' }}>
            {chevron('left')}
          </button>
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === centerIndex ? 'bg-amber-200/80 scale-[1.4]' : 'bg-white/15'}`} />
            ))}
          </div>
          <button onClick={() => cycle('right')} aria-label="Next" className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'linear-gradient(145deg, rgba(60,40,20,0.9), rgba(25,15,5,0.95))', boxShadow: '0 4px 12px -3px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,200,100,0.08)', border: '1px solid rgba(255,200,100,0.08)' }}>
            {chevron('right')}
          </button>
        </div>
      )}
    </section>
  );
}

/* ─── Add Card ─── */
function AddCard() {
  return (
    <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-3" style={{ background: 'linear-gradient(145deg, rgba(60,40,20,0.7), rgba(30,18,8,0.8))', boxShadow: '0 8px 24px -4px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,200,100,0.06), inset 0 -2px 4px rgba(0,0,0,0.2)', border: '2px dashed rgba(255,200,100,0.15)' }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #5BA3FF, #0F6FFF, #0050CC)', boxShadow: '0 4px 14px -3px rgba(15,111,255,0.5), inset 0 1px 2px rgba(255,255,255,0.2)' }}>
        <Plus className="w-6 h-6 text-white" />
      </div>
      <span className="text-[11px] text-amber-200/50 uppercase tracking-widest font-semibold">Add Book</span>
    </div>
  );
}

/* ─── Book Card ─── */
function BookCard({ book, onWrite }: { book: Book; onWrite?: () => void }) {
  const darkColor = adjustBrightness(book.coverColor, -30);
  return (
    <div className="w-full h-full rounded-2xl relative overflow-hidden group" style={{ background: `linear-gradient(145deg, ${adjustBrightness(book.coverColor, 10)} 0%, ${book.coverColor} 40%, ${darkColor} 100%)`, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Glossy overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 30%, transparent 60%)' }} />
      {/* Content */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-white font-bold text-sm md:text-base leading-tight mb-1.5 drop-shadow-md">{book.title}</h3>
          <p className="text-white/65 text-xs">{book.author}</p>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-[9px] text-white/40 uppercase tracking-widest">{book.category}</span>
          {book.hasPdf && (
            <div className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-md px-2 py-0.5">
              <FileText className="w-3 h-3 text-white/80" />
              <span className="text-[9px] text-white/80 font-medium">PDF</span>
            </div>
          )}
        </div>
      </div>
      {/* Write button (appears on hover) */}
      {onWrite && (
        <button
          onClick={(e) => { e.stopPropagation(); onWrite(); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)' }}
          aria-label="Write"
        >
          <PenLine className="w-3.5 h-3.5 text-white/80" />
        </button>
      )}
      {/* Page edges */}
      <div className="absolute right-0 top-3 bottom-3 w-[5px] pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.03), #F5F0E6 30%, #EDE8DC 60%, #E0D8CC 100%)', borderRadius: '0 6px 6px 0' }} />
    </div>
  );
}

function adjustBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0xff) + amt;
  const B = (num & 0xff) + amt;
  return '#' + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1);
}
