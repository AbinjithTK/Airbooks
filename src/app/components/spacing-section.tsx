export function SpacingSection() {
  const spacing = [
    { name: 'xs', value: '4px', pixels: 4 },
    { name: 'sm', value: '8px', pixels: 8 },
    { name: 'md', value: '16px', pixels: 16 },
    { name: 'lg', value: '24px', pixels: 24 },
    { name: 'xl', value: '32px', pixels: 32 },
    { name: '2xl', value: '48px', pixels: 48 },
    { name: '3xl', value: '64px', pixels: 64 },
    { name: '4xl', value: '96px', pixels: 96 },
  ];

  return (
    <div className="space-y-12">
      {/* Spacing Scale */}
      <div>
        <h3 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-white">Spacing Scale</h3>
        <div className="space-y-6">
          {spacing.map((space) => (
            <div key={space.name} className="flex items-center gap-6">
              <div className="w-24">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{space.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{space.value}</p>
              </div>
              <div className="flex items-center gap-3 flex-1">
                <div
                  className="bg-purple-500 rounded"
                  style={{ width: `${space.pixels}px`, height: '32px' }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{space.pixels}px</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <h3 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-white">Border Radius</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { name: 'None', value: '0px' },
            { name: 'Small', value: '4px' },
            { name: 'Medium', value: '8px' },
            { name: 'Large', value: '12px' },
            { name: 'XL', value: '16px' },
            { name: '2XL', value: '24px' },
            { name: 'Full', value: '9999px' },
          ].map((radius) => (
            <div key={radius.name} className="text-center space-y-3">
              <div className="flex justify-center">
                <div
                  className="w-24 h-24 bg-purple-500"
                  style={{ borderRadius: radius.value }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{radius.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{radius.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shadows */}
      <div>
        <h3 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-white">Elevation / Shadows</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: 'Small', shadow: '0 1px 2px rgba(0, 0, 0, 0.05)' },
            { name: 'Medium', shadow: '0 4px 6px rgba(0, 0, 0, 0.07)' },
            { name: 'Large', shadow: '0 10px 15px rgba(0, 0, 0, 0.1)' },
            { name: 'XL', shadow: '0 20px 25px rgba(0, 0, 0, 0.15)' },
            { name: '3D Shelf', shadow: '0 15px 30px rgba(0, 0, 0, 0.2), 0 8px 10px rgba(0, 0, 0, 0.15)' },
          ].map((shadow) => (
            <div key={shadow.name} className="text-center space-y-4">
              <div className="flex justify-center items-center h-40 bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                <div
                  className="w-32 h-24 bg-white dark:bg-gray-800 rounded-lg"
                  style={{ boxShadow: shadow.shadow }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{shadow.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-1">{shadow.shadow}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
