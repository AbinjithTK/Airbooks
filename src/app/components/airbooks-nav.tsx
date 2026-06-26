import { Search, User, Moon, Sun, LogOut, Library, X, Plus } from 'lucide-react';
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
    <div className="px-4 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Logo — multi-colored wordmark with trim path animation */}
        <Link to="/" className="flex items-center">
          <span className="text-3xl sm:text-4xl tracking-tight logo-text" style={{ fontFamily: "'Pacifico', cursive" }}>
            <span className="logo-char" style={{ color: '#4285F4', animationDelay: '0s' }}>A</span>
            <span className="logo-char" style={{ color: '#EA4335', animationDelay: '0.06s' }}>i</span>
            <span className="logo-char" style={{ color: '#FBBC05', animationDelay: '0.12s' }}>r</span>
            <span className="logo-char" style={{ color: '#4285F4', animationDelay: '0.18s' }}>B</span>
            <span className="logo-char" style={{ color: '#34A853', animationDelay: '0.24s' }}>o</span>
            <span className="logo-char" style={{ color: '#EA4335', animationDelay: '0.3s' }}>o</span>
            <span className="logo-char" style={{ color: '#FBBC05', animationDelay: '0.36s' }}>k</span>
            <span className="logo-char" style={{ color: '#A142F4', animationDelay: '0.42s' }}>s</span>
          </span>
          <style>{`
            .logo-char {
              display: inline-block;
              opacity: 0;
              transform: translateY(8px);
              animation: logoCharIn 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
            }
            @keyframes logoCharIn {
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search..."
              className="w-full sm:w-60 md:w-72 pl-11 sm:pl-14 pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-100 dark:bg-white/10 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            {searchQuery && (
              <button aria-label="Clear search query" onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* New Book */}
          <motion.button
            onClick={() => navigate('/new')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 sm:px-7 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base text-white cursor-pointer transition-colors whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #4285F4, #1A73E8)', boxShadow: '0 4px 14px -3px rgba(66,133,244,0.4)' }}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Book</span>
          </motion.button>

          {/* Theme toggle */}
          <motion.button
            aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
            onClick={onThemeToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 cursor-pointer transition-colors flex-shrink-0"
          >
            {isDarkMode ? <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-200" /> : <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-200" />}
          </motion.button>

          {/* Profile */}
          <div className="relative" ref={menuRef}>
            <motion.button
              aria-label="User profile menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl text-white text-xs sm:text-sm font-bold flex items-center justify-center cursor-pointer flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FF4081, #EA4335)', boxShadow: '0 4px 14px -3px rgba(234,67,53,0.4)' }}
            >
              {initials || <User className="w-5 h-5" />}
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                  className="absolute right-0 mt-3 w-72 sm:w-80 overflow-hidden rounded-2xl sm:rounded-3xl bg-white dark:bg-[#2a2a2a] shadow-2xl border border-gray-100 dark:border-gray-700 z-50"
                >
                  <div className="p-4 sm:p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-xs sm:text-sm font-bold bg-violet-600">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{profileName}</p>
                        <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 truncate">{profileEmail}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); onSignOut(); }}
                    className="w-full flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-5 h-5 text-gray-400" />
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
