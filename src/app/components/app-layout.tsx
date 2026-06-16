import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Loader2, BookOpen } from 'lucide-react';
import { AirBooksNav } from './airbooks-nav';
import { AddBookModal } from './add-book-modal';
import { AuthPage } from './auth-page';
import { Book } from '../types';
import { listBooks, saveBook, deleteBook as apiDeleteBook } from '../supabase-books';
import { removePdf } from '../pdf-store';
import { useAuth } from '../auth-context';
import { HandTrackingProvider } from './hand-tracking-provider';
import { HandCursorOverlay } from './hand-cursor-overlay';

interface AppContextType {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  openAddModal: () => void;
  addBook: (book: Book) => void;
  updateBook: (book: Book) => void;
  removeBook: (bookId: string) => void;
  refreshLibrary: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>({
  books: [],
  setBooks: () => {},
  openAddModal: () => {},
  addBook: () => {},
  updateBook: () => {},
  removeBook: () => {},
  refreshLibrary: async () => {},
});
export const useAppContext = () => useContext(AppContext);

export function AppLayout() {
  const { session, profile, loading, signOut } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const location = useLocation();
  const isReaderView = location.pathname.startsWith('/read/');

  const refreshLibrary = useCallback(async () => {
    setLibraryLoading(true);
    const remote = await listBooks();
    setBooks(remote);
    setLibraryLoading(false);
  }, []);

  // Load the signed-in user's library from the server.
  useEffect(() => {
    if (session) {
      refreshLibrary();
    } else {
      setBooks([]);
      setLibraryLoading(false);
    }
  }, [session, refreshLibrary]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const addBook = useCallback((book: Book) => {
    setBooks((prev) => [book, ...prev.filter((b) => b.id !== book.id)]);
  }, []);

  const updateBook = useCallback((book: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, ...book } : b)));
    // Persist metadata changes (themes, etc.) to the server.
    saveBook(book);
  }, []);

  const removeBook = useCallback(async (bookId: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
    await removePdf(bookId);
    await apiDeleteBook(bookId);
  }, []);

  // ─── Auth gate ───
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB] dark:bg-[#0A1628]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <Loader2 className="w-5 h-5 text-[#0F6FFF] animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <HandTrackingProvider>
      <AppContext.Provider
        value={{
          books,
          setBooks,
          openAddModal: () => setIsModalOpen(true),
          addBook,
          updateBook,
          removeBook,
          refreshLibrary,
        }}
      >
        <div className="min-h-screen bg-[#F8FAFB] dark:bg-[#0A1628] transition-colors">
          {!isReaderView && (
            <AirBooksNav
              onAddBook={() => setIsModalOpen(true)}
              isDarkMode={isDarkMode}
              onThemeToggle={toggleTheme}
              profileName={profile?.name || profile?.email || 'My Library'}
              profileEmail={profile?.email ?? ''}
              bookCount={books.length}
              onSignOut={signOut}
            />
          )}

          <main className="max-w-5xl mx-auto px-6">
            {libraryLoading && !isReaderView ? (
              <div className="py-24 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#0F6FFF] animate-spin" />
              </div>
            ) : (
              <Outlet />
            )}
          </main>

          <AddBookModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAdded={addBook}
          />

          <HandCursorOverlay />
        </div>
      </AppContext.Provider>
    </HandTrackingProvider>
  );
}
