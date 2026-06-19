import { Search, BookOpen, User, Moon, Sun, LogOut, Library, X, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AirBooksNavProps {
  onAddBook: () => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
  profileName: string;
  profileEmail: string;
  bookCount: number;
  onSignOut: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function AirBooksNav({
  onAddBook,
  isDarkMode,
  onThemeToggle,
  profileName,
  profileEmail,
  bookCount,
  onSignOut,
  searchQuery,
  onSearchChange,
}: AirBooksNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (profileName || profileEmail || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="sticky top-0 z-50 px-6 pt-5 pb-3">
      <div className="flex items-center justify-between">
        {/* Logo — large, game-style */}
        <Link to="/" className="flex items-center gap-3 group">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -3 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              boxShadow: '0 6px 20px -4px rgba(59,130,246,0.4), inset 0 1px 2px rgba(255,255,255,0.2)',
            }}
          >
            <BookOpen className="w-6 h-6 text-white" />
          </motion.div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">AirBooks</span>
        </Link>

        {/* Center: Search (expandable) */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search books..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-400 bg-white border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 transition-all"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Game-style action buttons */}
        <div className="flex items-center gap-3">
          {/* Add New — large prominent button */}
          <motion.button
            onClick={() => navigate('/new')}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm text-white cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              boxShadow: '0 6px 20px -4px rgba(59,130,246,0.4), inset 0 1px 2px rgba(255,255,255,0.2)',
            }}
          >
            <Plus className="w-5 h-5" />
            <span>New</span>
          </motion.button>

          {/* Theme toggle */}
          <motion.button
            onClick={onThemeToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-gray-700" /> : <Moon className="w-5 h-5 text-gray-700" />}
          </motion.button>

          {/* Profile */}
          <div className="relative" ref={menuRef}>
            <motion.button
              onClick={() => setMenuOpen((o) => !o)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 rounded-2xl text-white text-xs font-bold flex items-center justify-center cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                boxShadow: '0 4px 14px -3px rgba(139,92,246,0.4), inset 0 1px 2px rgba(255,255,255,0.2)',
              }}
            >
              {initials || <User className="w-5 h-5" />}
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-200"
                >
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{profileName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{profileEmail}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-blue-600 font-medium">
                      <Library className="w-3.5 h-3.5" />
                      <span>{bookCount} {bookCount === 1 ? 'book' : 'books'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); onSignOut(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-gray-400" />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
