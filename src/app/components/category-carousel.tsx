import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Sparkles,
  Bookmark,
  GraduationCap,
  Lightbulb,
  Globe,
  Heart,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface CategoryCarouselProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  bookCounts?: Record<string, number>;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  All: Layers,
  Fiction: BookOpen,
  'Non-Fiction': GraduationCap,
  Science: Lightbulb,
  Philosophy: Sparkles,
  History: Globe,
  Romance: Heart,
  Fantasy: Bookmark,
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  All: 'Browse your entire collection',
  Fiction: 'Novels, stories & literary works',
  'Non-Fiction': 'Facts, guides & real-world insights',
  Science: 'Physics, biology & the natural world',
  Philosophy: 'Thought, logic & meaning of life',
  History: 'Past events & civilizations',
  Romance: 'Love stories & relationships',
  Fantasy: 'Magic, myths & imagined worlds',
};

export function CategoryCarousel({
  categories,
  selected,
  onSelect,
  bookCounts = {},
}: CategoryCarouselProps) {
  const selectedIndex = categories.indexOf(selected);
  const [direction, setDirection] = useState(0); // -1 = left, 1 = right
  const isAnimating = useRef(false);

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating.current) return;
      if (index < 0 || index >= categories.length) return;
      const dir = index > selectedIndex ? 1 : -1;
      setDirection(dir);
      isAnimating.current = true;
      onSelect(categories[index]);
      setTimeout(() => {
        isAnimating.current = false;
      }, 450);
    },
    [categories, selectedIndex, onSelect]
  );

  const goPrev = () => goTo(selectedIndex - 1);
  const goNext = () => goTo(selectedIndex + 1);

  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex < categories.length - 1;

  const prevCategory = hasPrev ? categories[selectedIndex - 1] : null;
  const nextCategory = hasNext ? categories[selectedIndex + 1] : null;

  // Far ghost items (2 away)
  const hasFarPrev = selectedIndex > 1;
  const hasFarNext = selectedIndex < categories.length - 2;
  const farPrevCategory = hasFarPrev ? categories[selectedIndex - 2] : null;
  const farNextCategory = hasFarNext ? categories[selectedIndex + 2] : null;

  const ActiveIcon = CATEGORY_ICONS[selected] || BookOpen;
  const count = bookCounts[selected] ?? 0;
  const desc = CATEGORY_DESCRIPTIONS[selected] || `Explore ${selected} books`;

  // Parallax slide variants — the icon, text, and description move at different speeds
  const parallaxVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0,
      scale: 0.85,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -120 : 120,
      opacity: 0,
      scale: 0.85,
    }),
  };

  // Slower parallax for icon (moves less = feels further back)
  const iconParallax = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
      scale: 0.6,
      rotate: dir > 0 ? 20 : -20,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
      scale: 0.6,
      rotate: dir > 0 ? -20 : 20,
    }),
  };

  // Faster parallax for description (moves more = feels closer)
  const descParallax = {
    enter: (dir: number) => ({
      x: dir > 0 ? 180 : -180,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -180 : 180,
      opacity: 0,
    }),
  };

  // Count badge parallax (medium speed)
  const countParallax = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
      scale: 0.5,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      scale: 0.5,
    }),
  };

  const springTransition = {
    type: 'spring' as const,
    stiffness: 280,
    damping: 28,
    mass: 0.8,
  };

  const smoothTransition = {
    duration: 0.4,
    ease: [0.23, 1, 0.32, 1] as number[],
  };

  return (
    <div className="w-full select-none">
      <div className="relative flex items-center justify-center h-[88px] overflow-hidden">
        {/* ── Far-left ghost (2 positions away) ── */}
        {farPrevCategory && (
          <GhostItem
            category={farPrevCategory}
            count={bookCounts[farPrevCategory] ?? 0}
            position="far-left"
            onClick={() => goTo(selectedIndex - 2)}
          />
        )}

        {/* ── Left ghost (previous category) ── */}
        {prevCategory && (
          <GhostItem
            category={prevCategory}
            count={bookCounts[prevCategory] ?? 0}
            position="left"
            onClick={goPrev}
          />
        )}

        {/* ── Left arrow ── */}
        <motion.button
          onClick={goPrev}
          disabled={!hasPrev}
          className="absolute z-30 flex items-center justify-center w-8 h-8 rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none"
          style={{
            left: 'calc(50% - 170px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(15,111,255,0.08)',
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-4 h-4 text-[#0F6FFF] dark:text-[#3B82F6]" />
        </motion.button>

        {/* ── Center active category ── */}
        <div className="relative flex flex-col items-center justify-center z-20 w-[280px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={selected}
              custom={direction}
              className="flex items-center gap-2.5"
              initial="enter"
              animate="center"
              exit="exit"
            >
              {/* Category name */}
              <motion.span
                custom={direction}
                variants={parallaxVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={springTransition}
                className="text-lg font-semibold text-[#1A2332] dark:text-[#F1F5F9] tracking-tight whitespace-nowrap"
              >
                {selected}
              </motion.span>

              {/* Count badge */}
              {count > 0 && (
                <motion.span
                  custom={direction}
                  variants={countParallax}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={springTransition}
                  className="flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full text-[11px] font-medium bg-[#0F6FFF]/10 text-[#0F6FFF] dark:bg-[#3B82F6]/15 dark:text-[#3B82F6] shrink-0"
                >
                  {count}
                </motion.span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Right arrow ── */}
        <motion.button
          onClick={goNext}
          disabled={!hasNext}
          className="absolute z-30 flex items-center justify-center w-8 h-8 rounded-full transition-all disabled:opacity-0 disabled:pointer-events-none"
          style={{
            right: 'calc(50% - 170px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(15,111,255,0.08)',
          }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className="w-4 h-4 text-[#0F6FFF] dark:text-[#3B82F6]" />
        </motion.button>

        {/* ── Right ghost (next category) ── */}
        {nextCategory && (
          <GhostItem
            category={nextCategory}
            count={bookCounts[nextCategory] ?? 0}
            position="right"
            onClick={goNext}
          />
        )}

        {/* ── Far-right ghost (2 positions away) ── */}
        {farNextCategory && (
          <GhostItem
            category={farNextCategory}
            count={bookCounts[farNextCategory] ?? 0}
            position="far-right"
            onClick={() => goTo(selectedIndex + 2)}
          />
        )}

        {/* ── Progress dots ── */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {categories.map((_, idx) => (
            <motion.button
              key={idx}
              onClick={() => goTo(idx)}
              className="rounded-full"
              animate={{
                width: idx === selectedIndex ? 20 : 5,
                height: 5,
                backgroundColor:
                  idx === selectedIndex
                    ? '#0F6FFF'
                    : 'rgba(100,116,139,0.25)',
              }}
              whileHover={{
                backgroundColor:
                  idx === selectedIndex
                    ? '#0F6FFF'
                    : 'rgba(15,111,255,0.4)',
              }}
              transition={springTransition}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Ghost Item — faded category on left/right
   ───────────────────────────────────────────── */
interface GhostItemProps {
  category: string;
  count: number;
  position: 'far-left' | 'left' | 'right' | 'far-right';
  onClick: () => void;
}

function GhostItem({ category, count, position, onClick }: GhostItemProps) {
  const Icon = CATEGORY_ICONS[category] || BookOpen;

  const positionStyles: Record<string, { left?: string; right?: string; opacity: number; scale: number; blur: string }> = {
    'far-left': { right: 'calc(50% + 380px)', opacity: 0.15, scale: 0.7, blur: 'blur(1.5px)' },
    left: { right: 'calc(50% + 210px)', opacity: 0.35, scale: 0.82, blur: 'blur(0px)' },
    right: { left: 'calc(50% + 210px)', opacity: 0.35, scale: 0.82, blur: 'blur(0px)' },
    'far-right': { left: 'calc(50% + 380px)', opacity: 0.15, scale: 0.7, blur: 'blur(1.5px)' },
  };

  const config = positionStyles[position];

  return (
    <motion.button
      onClick={onClick}
      className="absolute z-10 flex items-center gap-2 cursor-pointer whitespace-nowrap top-1/2"
      initial={false}
      animate={{
        opacity: config.opacity,
        scale: config.scale,
      }}
      whileHover={{
        opacity: Math.min(config.opacity + 0.2, 0.7),
        scale: config.scale + 0.05,
      }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 28,
        mass: 0.8,
      }}
      style={{
        ...(config.left ? { left: config.left } : {}),
        ...(config.right ? { right: config.right } : {}),
        transform: 'translateY(-50%)',
        filter: config.blur,
      }}
    >
      <div
        className="flex items-center justify-center w-7 h-7 rounded-lg"
        style={{
          background: 'rgba(15,111,255,0.08)',
        }}
      >
        <Icon className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8]" />
      </div>
      <span className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
        {category}
      </span>
      {count > 0 && (
        <span className="text-[10px] font-medium text-[#94A3B8] dark:text-[#64748B]">
          {count}
        </span>
      )}
    </motion.button>
  );
}