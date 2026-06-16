import { BookShelf } from '../components/book-shelf';
import { Library, Grid } from 'lucide-react';
import { useState } from 'react';
import { useAppContext } from '../components/app-layout';
import { useNavigate } from 'react-router';
import { hasPdf } from '../pdf-store';
import { FileText } from 'lucide-react';
import { CategoryCarousel } from '../components/category-carousel';

export function LibraryPage() {
  const { books, openAddModal } = useAppContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'shelf' | 'grid'>('shelf');

  const categories = ['All', ...Array.from(new Set(books.map(b => b.category)))];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredBooks = selectedCategory === 'All' 
    ? books 
    : books.filter(b => b.category === selectedCategory);

  // Compute book counts per category
  const bookCounts: Record<string, number> = { All: books.length };
  books.forEach(b => {
    bookCounts[b.category] = (bookCounts[b.category] || 0) + 1;
  });

  return (
    <div className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          
          
        </div>

        <div className="flex items-center gap-4">
          {/* View Toggle */}
          
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

      {/* Books Display */}
      {viewMode === 'shelf' ? (
        <BookShelf books={filteredBooks} onAddBook={openAddModal} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => navigate(`/read/${book.id}`)}
              className="rounded-lg shadow-xl cursor-pointer hover:scale-105 transition-transform relative overflow-hidden"
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
            </div>
          ))}
        </div>
      )}
    </div>
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