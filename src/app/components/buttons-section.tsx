import { Download, ChevronRight, Loader2 } from 'lucide-react';

export function ButtonsSection() {
  return (
    <div className="space-y-12">
      {/* Primary Buttons */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Primary Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-medium">
            Primary Button
          </button>
          <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            With Icon
          </button>
          <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-medium flex items-center gap-2">
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
          <button disabled className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 rounded-lg cursor-not-allowed font-medium">
            Disabled
          </button>
          <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-medium flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading
          </button>
        </div>
      </div>

      {/* Secondary Buttons */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Secondary Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium">
            Secondary
          </button>
          <button className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            With Icon
          </button>
          <button disabled className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 rounded-lg cursor-not-allowed font-medium">
            Disabled
          </button>
        </div>
      </div>

      {/* Outline Buttons */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Outline Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-6 py-3 border-2 border-gray-900 dark:border-white text-gray-900 dark:text-white rounded-lg hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all font-medium">
            Outline
          </button>
          <button className="px-6 py-3 border-2 border-gray-900 dark:border-white text-gray-900 dark:text-white rounded-lg hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            With Icon
          </button>
          <button disabled className="px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600 rounded-lg cursor-not-allowed font-medium">
            Disabled
          </button>
        </div>
      </div>

      {/* Ghost Buttons */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Ghost Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-6 py-3 text-gray-900 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium">
            Ghost
          </button>
          <button className="px-6 py-3 text-gray-900 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            With Icon
          </button>
          <button disabled className="px-6 py-3 text-gray-400 dark:text-gray-600 rounded-lg cursor-not-allowed font-medium">
            Disabled
          </button>
        </div>
      </div>

      {/* Size Variations */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Size Variations</h3>
        <div className="flex flex-wrap items-center gap-4">
          <button className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all text-sm font-medium">
            Small
          </button>
          <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-medium">
            Medium
          </button>
          <button className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all text-lg font-medium">
            Large
          </button>
        </div>
      </div>

      {/* Destructive */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Destructive Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium">
            Delete
          </button>
          <button className="px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all font-medium">
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
