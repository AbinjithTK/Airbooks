import { Heart, Share2, MoreVertical } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export function CardsSection() {
  return (
    <div className="space-y-12">
      {/* Basic Cards */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Basic Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Simple Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Simple Card</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              A basic card component with padding, rounded corners, and subtle shadow.
            </p>
          </div>

          {/* Card with Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-purple-500 h-24"></div>
            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Header Card</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Card with colored header section for visual hierarchy.
              </p>
            </div>
          </div>

          {/* Interactive Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 cursor-pointer hover:scale-105">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Interactive</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Hover over this card to see the scale effect.
            </p>
          </div>
        </div>
      </div>

      {/* Product Cards */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Product Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 overflow-hidden group cursor-pointer">
              <div className="relative aspect-square bg-gradient-to-br from-purple-400 to-pink-400 overflow-hidden">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform">
                    <Heart className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Product Title {i}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Brief product description</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">$99.00</span>
                  <button className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edition Cards (Shopify Style) */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Edition Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { title: 'The Renaissance Edition', year: '2026', season: 'Winter', gradient: 'from-orange-400 to-pink-500' },
            { title: 'Horizons', year: '2025', season: 'Summer', gradient: 'from-purple-500 to-pink-500' },
            { title: 'The Boring Edition', year: '2025', season: 'Winter', gradient: 'from-yellow-400 to-green-400' },
            { title: 'Unified', year: '2024', season: 'Summer', gradient: 'from-gray-700 to-gray-900' },
          ].map((edition, i) => (
            <div key={i} className="group cursor-pointer">
              <div className={`aspect-square bg-gradient-to-br ${edition.gradient} rounded-lg mb-4 shadow-xl group-hover:shadow-2xl transition-all group-hover:scale-105 flex items-center justify-center relative overflow-hidden`}>
                <h4 className="text-white font-bold text-xl text-center px-6">{edition.title}</h4>
                {i === 0 && (
                  <div className="absolute top-4 left-4 bg-white text-black px-3 py-1 rounded-full text-xs font-semibold">
                    NOW PLAYING
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {edition.year}<br />{edition.season}
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{edition.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Stat Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Revenue', value: '$45,231', change: '+20.1%', positive: true },
            { label: 'Active Users', value: '2,350', change: '+15.3%', positive: true },
            { label: 'Conversion Rate', value: '3.2%', change: '-2.4%', positive: false },
            { label: 'Avg. Order Value', value: '$124', change: '+8.7%', positive: true },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</p>
              <p className={`text-sm font-medium ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} from last month
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
