import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Loader2, BookOpen } from 'lucide-react';
import { AirBooksNav } from './airbooks-nav';
import { AddBookModal } from './add-book-modal';
import { BookCreator } from './book-creator';
import { BookOpenCinematic } from './book-open-cinematic';
import { AuthPageV2 } from './auth-page-v2';
import { Book } from '../types';
import { listBooks, saveBook, deleteBook as apiDeleteBook } from '../supabase-books';
import { removePdf } from '../pdf-store';
import { useAuth } from '../auth-context';
import { useWorld } from '../world/world-provider';
import { HandTrackingProvider } from './hand-tracking-provider';
import { HandCursorOverlay } from './hand-cursor-overlay';

interface AppContextType {
  books: Book[];
  setBooks: React.Dispatch<React.SetStateAction<Book[]>>;
  openAddModal: () => void;
  addBook: (book: Book) => void;
  updateBook: (book: Book) => void;
  removeBook: (bookId: string) => Promise<void>;
  refreshLibrary: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  /** Trigger cinematic book-open animation then navigate to reader */
  openBook: (book: Book) => void;
}

export const AppContext = createContext<AppContextType>({
  books: [],
  setBooks: () => {},
  openAddModal: () => {},
  addBook: () => {},
  updateBook: () => {},
  removeBook: async () => {},
  refreshLibrary: async () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  openBook: () => {},
});
export const useAppContext = () => useContext(AppContext);

// ─── Theme helpers ───
const THEME_KEY = 'airbooks-theme';

// Resolve the initial theme: an explicit saved choice wins, otherwise fall back
// to the operating-system preference (prefers-color-scheme).
function getInitialDarkMode(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // localStorage may be unavailable (private mode / partitioned storage).
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function AppLayout() {
  const { session, profile, loading, signOut } = useAuth();
  const { setView, setActiveSkybox } = useWorld();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialDarkMode);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cinematicBook, setCinematicBook] = useState<Book | null>(null);
  const location = useLocation();
  const isReaderView = location.pathname.startsWith('/read/');
  const isCreateView = location.pathname === '/create';
  const isWriterView = location.pathname.startsWith('/write/');
  const isChoiceView = location.pathname === '/new';
  const isFullScreen = isReaderView || isCreateView || isWriterView || isChoiceView;

  // Drive the persistent 3D camera from auth + route state.
  useEffect(() => {
    if (loading) return;
    if (!session) {
      setView('login');
    } else {
      setView(isReaderView ? 'reader' : 'library');
    }
  }, [loading, session, isReaderView, setView]);

  // Pre-apply book's skybox theme when entering reader mode
  useEffect(() => {
    if (isReaderView) {
      const bookId = location.pathname.split('/read/')[1];
      const book = books.find(b => b.id === bookId);
      // Always set a theme — use book's choice or default to 'library'
      setActiveSkybox(book?.skyboxTheme ?? 'library');
    } else {
      setActiveSkybox(null);
    }
  }, [isReaderView, books, location.pathname, setActiveSkybox]);

  // Keep the <html> class in sync with the current theme.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Follow the OS theme automatically — but only while the user hasn't made an
  // explicit choice (no saved preference). Once they toggle, we stop following.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => {
      let hasExplicitChoice = false;
      try {
        hasExplicitChoice = !!localStorage.getItem(THEME_KEY);
      } catch {
        // ignore
      }
      if (!hasExplicitChoice) setIsDarkMode(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        // Persist the explicit choice so it survives refreshes and overrides
        // the OS preference from now on.
        localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      return next;
    });
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

  const openBook = useCallback((book: Book) => {
    setCinematicBook(book);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    if (cinematicBook) {
      navigate(`/read/${cinematicBook.id}`);
      setCinematicBook(null);
    }
  }, [cinematicBook, navigate]);

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
    return <AuthPageV2 />;
  }

  return (
    <HandTrackingProvider>
      <AppContext.Provider
        value={{
          books,
          setBooks,
          openAddModal: () => navigate('/new'),
          addBook,
          updateBook,
          removeBook,
          refreshLibrary,
          searchQuery,
          setSearchQuery,
          openBook,
        }}
      >
        <div
          className={`min-h-screen ${isReaderView ? 'bg-transparent' : 'bg-white dark:bg-[#1a1a1a]'}`}
        >
          {!isFullScreen && (
            <AirBooksNav
              onAddBook={() => setIsModalOpen(true)}
              isDarkMode={isDarkMode}
              onThemeToggle={toggleTheme}
              profileName={profile?.name || profile?.email || 'My Library'}
              profileEmail={profile?.email ?? ''}
              bookCount={books.length}
              onSignOut={signOut}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}

          <main className={isFullScreen ? '' : 'max-w-5xl mx-auto px-3 sm:px-6'}>
            {libraryLoading && !isFullScreen ? (
              <div className="py-24 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#0F6FFF] animate-spin" />
              </div>
            ) : (
              <Outlet />
            )}
          </main>

          <AddBookModal
            isOpen={false}
            onClose={() => {}}
            onAdded={addBook}
          />

          {/* New game-like Book Creator */}
          <BookCreator
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onCreated={addBook}
          />

          {/* Cinematic book-open transition */}
          <BookOpenCinematic
            book={cinematicBook}
            onComplete={handleCinematicComplete}
          />

          <HandCursorOverlay />
        </div>
      </AppContext.Provider>
    </HandTrackingProvider>
  );
}
