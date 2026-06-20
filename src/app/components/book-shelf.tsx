import { Book } from '../types';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { BookOpen, Eye, Plus, Trash2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { Book3DCanvas } from './book-3d-canvas';

interface BookShelfProps {
  books: Book[];
  onAddBook?: () => void;
  onRequestDelete?: (book: Book) => void;
  onOpenBook?: (book: Book) => void;
}

export function BookShelf({ books, onAddBook, onRequestDelete, onOpenBook }: BookShelfProps) {
  const navigate = useNavigate();

  const handleOpen = (book: Book) => {
    if (onOpenBook) onOpenBook(book);
    else navigate(`/read/${book.id}`);
  };

  type ShelfItem = { type: 'add' } | { type: 'book'; book: Book };
  const items: ShelfItem[] = [
    ...(onAddBook ? [{ type: 'add' as const }] : []),
    ...books.map(book => ({ type: 'book' as const, book })),
  ];

  // Responsive: 2 per shelf on mobile, 3 tablet, 4 desktop
  const perShelf = typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : window.innerWidth < 768 ? 3 : 4;
  const shelves: ShelfItem[][] = [];
  for (let i = 0; i < items.length; i += perShelf) {
    shelves.push(items.slice(i, i + perShelf));
  }

  return (
    <div className="space-y-6">
      {shelves.map((shelf, si) => (
        <div key={si} className="relative">
          {/* Books row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-8 pb-2 relative z-10">
            {shelf.map((item, idx) =>
              item.type === 'add' ? (
                <AddCard key="__add__" index={idx} shelfIndex={si} onClick={onAddBook!} />
              ) : (
                <BookCard
                  key={item.book.id}
                  book={item.book}
                  index={idx}
                  shelfIndex={si}
                  onOpen={() => handleOpen(item.book)}
                  onRequestDelete={onRequestDelete}
                />
              )
            )}
          </div>
          {/* Shelf bar */}
          <Shelf3D />
        </div>
      ))}

      {books.length === 0 && !onAddBook && (
        <div className="text-center py-32">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Your library is empty</h3>
          <p className="text-gray-400">Add your first book to get started</p>
        </div>
      )}
    </div>
  );
}

/* ═══════ 3D Shelf Bar ═══════ */
function Shelf3D() {
  return (
    <div className="relative" style={{ height: 32, perspective: '600px' }}>
      {/* Top surface — the platform books rest on */}
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: 10,
          background: 'linear-gradient(180deg, #C4A882, #B09570)',
          borderRadius: '2px 2px 0 0',
          transform: 'rotateX(20deg)',
          transformOrigin: 'bottom center',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
      />
      {/* Front face */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: 8,
          height: 18,
          background: 'linear-gradient(180deg, #8B7355, #6B5740)',
          borderRadius: '0 0 4px 4px',
          boxShadow: '0 4px 12px -2px rgba(60,40,20,0.25)',
        }}
      >
        {/* Wood grain */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(0,0,0,0.15) 14px, rgba(0,0,0,0.08) 15px)' }} />
      </div>
      {/* Under-shelf shadow */}
      <div className="absolute left-4 right-4" style={{ top: 26, height: 10, background: 'radial-gradient(ellipse 90% 100% at 50% 0%, rgba(40,25,10,0.12), transparent)', filter: 'blur(3px)' }} />
    </div>
  );
}

/* ═══════ Add Card ═══════ */
function AddCard({ index, shelfIndex, onClick }: { index: number; shelfIndex: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: shelfIndex * 0.1 + index * 0.06, duration: 0.4 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="cursor-pointer"
    >
      <motion.div
        animate={{ y: hovered ? -8 : 0, scale: hovered ? 1.03 : 1 }}
        transition={{ duration: 0.3 }}
        className="relative rounded-2xl flex flex-col items-center justify-center gap-3"
        style={{ aspectRatio: '3/4.2', background: 'linear-gradient(145deg, #B8A68E, #9E8A72, #8B7760)', border: '2px dashed rgba(255,255,255,0.3)' }}
      >
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-white/80" />
        </div>
        <span className="text-[10px] sm:text-xs text-white/60 uppercase tracking-widest font-medium">Add Book</span>
      </motion.div>
    </motion.div>
  );
}

/* ═══════ Book Card (Three.js) ═══════ */
interface BookCardProps {
  book: Book;
  index: number;
  shelfIndex: number;
  onOpen: () => void;
  onRequestDelete?: (book: Book) => void;
}

function BookCard({ book, index, shelfIndex, onOpen, onRequestDelete }: BookCardProps) {
  const [hovered, setHovered] = useState(false);
  const didDrag = useRef(false);

  const handlePointerDown = () => { didDrag.current = false; };
  const handlePointerMove = () => { didDrag.current = true; };
  const handleClick = () => { if (!didDrag.current) onOpen(); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: shelfIndex * 0.1 + index * 0.06, duration: 0.4 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      <motion.div
        animate={{ y: hovered ? -10 : 0, scale: hovered ? 1.02 : 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
        className="relative overflow-visible"
        style={{ aspectRatio: '3/4.2' }}
      >
        {/* Three.js book — same model as the create/edit page */}
        <Book3DCanvas
          color={book.coverColor}
          title={book.title}
          author={book.author}
          category={book.category}
          interactive={true}
          zoom={1.1}
          coverImage={book.coverImage}
          coverImageTransform={book.coverImageTransform}
        />

        {/* Hover overlay — no box, just floating label */}
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-end justify-center pb-2 z-10 pointer-events-none"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-[11px] font-medium pointer-events-auto" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <Eye className="w-3 h-3" /> Open
            </div>
          </motion.div>
        )}

        {/* Delete */}
        {onRequestDelete && hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => { e.stopPropagation(); onRequestDelete(book); }}
            className="absolute top-1 right-1 z-20 p-1.5 rounded-full text-white cursor-pointer"
            style={{ background: 'rgba(220,38,38,0.85)' }}
          >
            <Trash2 className="w-3 h-3" />
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
