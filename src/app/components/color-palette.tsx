export function ColorPalette() {
  const colors = [
    { name: 'Primary', value: '#2B2B2B', usage: 'Main text, headers, primary actions' },
    { name: 'Secondary', value: '#717171', usage: 'Secondary text, labels' },
    { name: 'Background', value: '#E5E5E5', usage: 'Page background, subtle surfaces' },
    { name: 'White', value: '#FFFFFF', usage: 'Cards, elevated surfaces' },
    { name: 'Accent Purple', value: '#9F5FFF', usage: 'Interactive elements, highlights' },
    { name: 'Accent Orange', value: '#FFA133', usage: 'Warnings, hot features' },
    { name: 'Success', value: '#1DB954', usage: 'Success states, confirmations' },
    { name: 'Error', value: '#E01E5A', usage: 'Errors, destructive actions' },
  ];

  const grays = [
    { name: 'Gray 50', value: '#F9F9F9' },
    { name: 'Gray 100', value: '#F3F3F3' },
    { name: 'Gray 200', value: '#E5E5E5' },
    { name: 'Gray 300', value: '#D1D1D1' },
    { name: 'Gray 400', value: '#A3A3A3' },
    { name: 'Gray 500', value: '#717171' },
    { name: 'Gray 600', value: '#525252' },
    { name: 'Gray 700', value: '#3B3B3B' },
    { name: 'Gray 800', value: '#2B2B2B' },
    { name: 'Gray 900', value: '#1A1A1A' },
  ];

  return (
    <div className="space-y-12">
      {/* Primary Colors */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Primary Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {colors.map((color) => (
            <div key={color.name} className="space-y-3">
              <div
                className="h-32 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                style={{ backgroundColor: color.value }}
              />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{color.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{color.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{color.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gray Scale */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Gray Scale</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4">
          {grays.map((gray) => (
            <div key={gray.name} className="space-y-2">
              <div
                className="h-20 rounded-lg shadow border border-gray-200 dark:border-gray-700"
                style={{ backgroundColor: gray.value }}
              />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">{gray.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">{gray.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
