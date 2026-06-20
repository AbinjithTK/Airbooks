import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import gsap from 'gsap';
import { Book } from '../../types';
import { Book3DCanvas } from '../book-3d-canvas';

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
  return { rot: distance * 18, scale: 1.0 - 0.25 * absD * absD, x: distance * 28, y: absD * absD * 5, zIndex: 10 - Math.abs(slot - center) };
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

  type Item = { type: 'add' } | { type: 'book'; book: Book; idx: number };
  const items: Item[] = [{ type: 'add' }, ...books.map((book, idx) => ({ type: 'book' as const, book, idx }))];
  const totalCards = items.length;
  const needsPagination = totalCards > MAX_VISIBLE;
  const [centerIndex, setCenterIndex] = useState(needsPagination ? HALF : totalCards >> 1);

  const getVisibleMap = useCallback((center: number) => {
    const map = new Map<number, number>();
    if (!needsPagination) { items.forEach((_, i) => map.set(i, i)); return map; }
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
      <div ref={containerRef} className="relative flex justify-center items-center w-full min-h-[16rem] sm:min-h-[20rem] md:min-h-[24rem] lg:min-h-[28rem]">
        {items.map((item, index) => (
          <FanCardWrapper
            key={item.type === 'add' ? '__add__' : (item as any).book.id}
            item={item}
            onAdd={onAddBook}
            onOpen={onOpenBook}
          />
        ))}
      </div>

      {needsPagination && (
        <div className="flex items-center justify-center gap-5 mt-4 z-30">
          <button onClick={() => cycle('left')} aria-label="Previous" className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
            {chevron('left')}
          </button>
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === centerIndex ? 'bg-[#4285F4] scale-[1.4]' : 'bg-gray-300 dark:bg-white/20'}`} />
            ))}
          </div>
          <button onClick={() => cycle('right')} aria-label="Next" className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
            {chevron('right')}
          </button>
        </div>
      )}
    </section>
  );
}

/* ─── Fan Card Wrapper — handles drag vs click ─── */
function FanCardWrapper({ item, onAdd, onOpen }: { item: any; onAdd: () => void; onOpen: (book: Book) => void }) {
  const didDrag = useRef(false);
  const handleDown = () => { didDrag.current = false; };
  const handleMove = () => { didDrag.current = true; };
  const handleClick = () => {
    if (didDrag.current) return; // Don't open if user dragged
    if (item.type === 'add') onAdd();
    else onOpen(item.book);
  };

  return (
    <div
      className="fan-card absolute w-[8rem] h-[11rem] sm:w-[10rem] sm:h-[14rem] md:w-[12rem] md:h-[16rem] lg:w-[14rem] lg:h-[19rem] overflow-visible cursor-pointer select-none"
      style={{ willChange: 'transform, opacity' }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onClick={handleClick}
    >
      {item.type === 'add' ? <AddCard /> : <BookCard book={item.book} />}
    </div>
  );
}

/* ─── Add Card ─── */
function AddCard() {
  return (
    <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-3" style={{ background: 'linear-gradient(145deg, #B8A68E, #9E8A72, #8B7760)', border: '2px dashed rgba(255,255,255,0.3)' }}>
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
        <Plus className="w-5 h-5 text-white/80" />
      </div>
      <span className="text-[10px] text-white/60 uppercase tracking-widest font-medium">Add Book</span>
    </div>
  );
}

/* ─── Book Card (Three.js) ─── */
function BookCard({ book }: { book: Book }) {
  return (
    <div className="w-full h-full relative overflow-visible">
      <Book3DCanvas
        color={book.coverColor}
        title={book.title}
        author={book.author}
        category={book.category}
        interactive={true}
        zoom={1.05}
        coverImage={book.coverImage}
        coverImageTransform={book.coverImageTransform}
      />
    </div>
  );
}
