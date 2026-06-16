import { Search, BookOpen, User, Moon, Sun, LogOut, Library } from 'lucide-react';
import { Link } from 'react-router';
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
}

export function AirBooksNav({
  isDarkMode,
  onThemeToggle,
  profileName,
  profileEmail,
  bookCount,
  onSignOut,
}: AirBooksNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#1A2332]/80 backdrop-blur-xl border-b border-[#0F6FFF]/10 dark:border-[#3B82F6]/20">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] rounded-xl flex items-center justify-center shadow-lg shadow-[#0F6FFF]/20 group-hover:shadow-xl group-hover:shadow-[#0F6FFF]/30 transition-all">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#0F6FFF] to-[#0EA5E9] bg-clip-text text-transparent">
              AirBooks
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search your library..."
                className="w-full pl-12 pr-4 py-3 bg-[#F8FAFB] dark:bg-[#0A1628] border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 rounded-xl text-[#1A2332] dark:text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0F6FFF] dark:focus:ring-[#3B82F6] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onThemeToggle}
              className="p-2.5 rounded-xl bg-[#F8FAFB] dark:bg-[#1E293B] text-[#1A2332] dark:text-[#F1F5F9] hover:bg-[#E8F2FF] dark:hover:bg-[#1E3A5F] transition-all"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Profile */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] text-white text-sm font-semibold flex items-center justify-center hover:shadow-lg hover:shadow-[#0F6FFF]/30 transition-all"
              >
                {initials || <User className="w-5 h-5" />}
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1A2332] rounded-2xl shadow-2xl border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 overflow-hidden"
                  >
                    <div className="p-4 border-b border-[#0F6FFF]/10 dark:border-[#3B82F6]/20">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] text-white text-sm font-semibold flex items-center justify-center">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A2332] dark:text-[#F1F5F9] truncate">
                            {profileName}
                          </p>
                          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">
                            {profileEmail}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#0F6FFF] dark:text-[#3B82F6]">
                        <Library className="w-3.5 h-3.5" />
                        <span>
                          {bookCount} {bookCount === 1 ? 'book' : 'books'} in your library
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#1A2332] dark:text-[#F1F5F9] hover:bg-[#F8FAFB] dark:hover:bg-[#1E293B] transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-[#64748B]" />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
