import { Search, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export function FormsSection() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-12">
      {/* Text Inputs */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Text Inputs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Default */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Default Input
            </label>
            <input
              type="text"
              placeholder="Enter text..."
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
            />
          </div>

          {/* With Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Search Input
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
          </div>

          {/* Error State */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Error State
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border-2 border-red-500 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <p className="text-sm text-red-600 mt-1">Please enter a valid email address</p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password..."
                className="w-full px-4 py-3 pr-11 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Disabled */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-600 mb-2">
              Disabled Input
            </label>
            <input
              type="text"
              placeholder="Disabled..."
              disabled
              className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg text-gray-500 placeholder-gray-400 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Select Dropdowns */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Select Dropdowns</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Default Select
            </label>
            <select className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent">
              <option>Select an option...</option>
              <option>Option 1</option>
              <option>Option 2</option>
              <option>Option 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Textarea</h3>
        <div className="max-w-4xl">
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Message
          </label>
          <textarea
            rows={4}
            placeholder="Enter your message..."
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Checkboxes & Radio */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Checkboxes & Radio Buttons</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
          {/* Checkboxes */}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">Checkboxes</p>
            <div className="space-y-3">
              {['Option 1', 'Option 2', 'Option 3'].map((option, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={i === 0}
                    className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-white cursor-pointer"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Radio Buttons */}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-4">Radio Buttons</p>
            <div className="space-y-3">
              {['Choice A', 'Choice B', 'Choice C'].map((choice, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="radio-group"
                    defaultChecked={i === 0}
                    className="w-5 h-5 border-gray-300 text-black focus:ring-black dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-white cursor-pointer"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{choice}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Switches */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Toggle Switches</h3>
        <div className="space-y-4 max-w-md">
          {['Enable notifications', 'Auto-save', 'Dark mode'].map((label, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-gray-900 dark:text-white">{label}</span>
              <label className="relative inline-block w-12 h-6 cursor-pointer">
                <input type="checkbox" defaultChecked={i === 0} className="sr-only peer" />
                <div className="w-12 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:bg-black dark:peer-checked:bg-white transition-colors"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white dark:bg-gray-900 rounded-full transition-transform peer-checked:translate-x-6"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
