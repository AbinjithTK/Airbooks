import { useState } from 'react';
import { Search, Moon, Sun } from 'lucide-react';

interface DesignSystemNavProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

export function DesignSystemNav({ activeSection, onSectionChange, isDarkMode, onThemeToggle }: DesignSystemNavProps) {
  const [searchValue, setSearchValue] = useState('');

  const sections = [
    'Overview',
    'Colors',
    'Typography',
    'Spacing',
    'Buttons',
    'Cards',
    'Forms',
    'Navigation',
    'Badges',
    'Tables',
    'Modals',
    'Icons',
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-[#2B2B2B] border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-[1400px] mx-auto px-8 py-4">
        <div className="flex items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-md flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-white dark:text-black">
                <path d="M10 2L3 7V13L10 18L17 13V7L10 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Design System</span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search components..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center gap-6">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => onSectionChange(section)}
                className={`text-sm transition-colors ${
                  activeSection === section
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {section}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
