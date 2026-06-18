import { BookShelf } from '../components/book-shelf';
import { Library, Grid, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import { useAppContext } from '../components/app-layout';
import { useNavigate } from 'react-router';
import { hasPdf } from '../pdf-store';
import { FileText } from 'lucide-react';
import { CategoryCarousel } from '../components/category-carousel';
import { Book } from '../types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const VIEW_KEY = 'airbooks-view';

function getInitialView(): 'shelf' | 'grid' {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === 'grid' || saved === 'shelf') return saved;
  } catch {
    // ignore
  }
  return 'shelf';
}

export function LibraryPage() {
  const { books, openAddModal, removeBook, searchQuery } = useAppContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'shelf' | 'grid'>(getInitialView);

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category)))];
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Book pending deletion (drives the confirmation dialog).
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);

  const setView = (mode: 'shelf' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_KEY, mode);
    } catch {
      // ignore
    }
  };

  // Filter by category, then by free-text search across title / author / category.
  const query = searchQuery.trim().toLowerCase();
  const filteredBooks = books.filter((b) => {
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
    if (!matchesCategory) return false;
    if (!query) return true;
    return (
      b.title.toLowerCase().includes(query) ||
      b.author.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query)
    );
  });

  // Compute book counts per category
  const bookCounts: Record<string, number> = { All: books.length };
  books.forEach(b => {
    bookCounts[b.category] = (bookCounts[b.category] || 0) + 1;
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await removeBook(pendingDelete.id);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div />

        <div className="flex items-center gap-4">
          {/* View Toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20">
            <ViewToggleButton
              active={viewMode === 'shelf'}
              onClick={() => setView('shelf')}
              icon={<Library className="w-4 h-4" />}
              label="Shelf"
            />
            <ViewToggleButton
              active={viewMode === 'grid'}
              onClick={() => setView('grid')}
              icon={<Grid className="w-4 h-4" />}
              label="Grid"
            />
          </div>
        </div>
      </div>

      {/* Category Carousel */}
      <div className="mb-12 py-4">
        <CategoryCarousel
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          bookCounts={bookCounts}
        />
      </div>

      {/* No search results */}
      {query && filteredBooks.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#0F6FFF]/15 to-[#0EA5E9]/15 rounded-3xl flex items-center justify-center">
            <Search className="w-9 h-9 text-[#0F6FFF] dark:text-[#3B82F6]" />
          </div>
          <h3 className="text-xl font-semibold text-[#1A2332] dark:text-[#F1F5F9] mb-2">
            No books match “{searchQuery}”
          </h3>
          <p className="text-[#64748B] dark:text-[#94A3B8]">
            Try a different title, author, or category.
          </p>
        </div>
      ) : viewMode === 'shelf' ? (
        <BookShelf
          books={filteredBooks}
          onAddBook={query ? undefined : openAddModal}
          onRequestDelete={setPendingDelete}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => navigate(`/read/${book.id}`)}
              className="group rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform relative overflow-hidden"
              style={{
                aspectRatio: '4/5',
                background: `linear-gradient(145deg, ${book.coverColor} 0%, ${adjustBrightness(book.coverColor, -25)} 100%)`,
              }}
            >
              <div className="p-5 h-full flex flex-col justify-between relative">
                <div>
                  <h3 className="text-white font-bold text-[15px] leading-tight mb-1.5">
                    {book.title}
                  </h3>
                  <p className="text-white/75 text-xs">{book.author}</p>
                </div>
                <span className="text-[9px] text-white/50 uppercase tracking-widest">
                  {book.category}
                </span>
              </div>
              {(book.hasPdf || hasPdf(book.id)) && (
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-md px-2 py-0.5 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-white/80" />
                  <span className="text-[9px] text-white/80 font-medium">PDF</span>
                </div>
              )}
              {/* Delete button (appears on hover) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(book);
                }}
                aria-label={`Delete ${book.title}`}
                className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-black/40 text-white/90 opacity-0 group-hover:opacity-100 hover:bg-red-500/90 backdrop-blur-sm transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” by {pendingDelete?.author} will be permanently
              removed from your library
              {pendingDelete?.hasPdf ? ', including its uploaded PDF' : ''}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ViewToggleButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function ViewToggleButton({ active, onClick, icon, label }: ViewToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-white dark:bg-[#0A1628] text-[#0F6FFF] dark:text-[#3B82F6] shadow-sm'
          : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1A2332] dark:hover:text-[#F1F5F9]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

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
