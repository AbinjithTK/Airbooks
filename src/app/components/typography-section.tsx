export function TypographySection() {
  const headings = [
    { tag: 'h1', size: '48px', weight: '600', lineHeight: '56px', sample: 'Design System Heading 1' },
    { tag: 'h2', size: '36px', weight: '600', lineHeight: '44px', sample: 'Design System Heading 2' },
    { tag: 'h3', size: '28px', weight: '600', lineHeight: '36px', sample: 'Design System Heading 3' },
    { tag: 'h4', size: '24px', weight: '600', lineHeight: '32px', sample: 'Design System Heading 4' },
    { tag: 'h5', size: '20px', weight: '600', lineHeight: '28px', sample: 'Design System Heading 5' },
    { tag: 'h6', size: '16px', weight: '600', lineHeight: '24px', sample: 'Design System Heading 6' },
  ];

  const bodyText = [
    { name: 'Body Large', size: '18px', weight: '400', lineHeight: '28px' },
    { name: 'Body Regular', size: '16px', weight: '400', lineHeight: '24px' },
    { name: 'Body Small', size: '14px', weight: '400', lineHeight: '20px' },
    { name: 'Caption', size: '12px', weight: '400', lineHeight: '16px' },
  ];

  return (
    <div className="space-y-12">
      {/* Headings */}
      <div>
        <h3 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-white">Headings</h3>
        <div className="space-y-8">
          {headings.map(({ tag, size, weight, lineHeight, sample }) => (
            <div key={tag} className="flex items-start gap-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="w-32 flex-shrink-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase">{tag}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{size}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Weight: {weight}</p>
              </div>
              <div className="flex-1">
                {tag === 'h1' && <h1 className="text-gray-900 dark:text-white" style={{ fontSize: size, fontWeight: weight, lineHeight }}>{sample}</h1>}
                {tag === 'h2' && <h2 className="text-gray-900 dark:text-white" style={{ fontSize: size, fontWeight: weight, lineHeight }}>{sample}</h2>}
                {tag === 'h3' && <h3 className="text-gray-900 dark:text-white" style={{ fontSize: size, fontWeight: weight, lineHeight }}>{sample}</h3>}
                {tag === 'h4' && <h4 className="text-gray-900 dark:text-white" style={{ fontSize: size, fontWeight: weight, lineHeight }}>{sample}</h4>}
                {tag === 'h5' && <h5 className="text-gray-900 dark:text-white" style={{ fontSize: size, fontWeight: weight, lineHeight }}>{sample}</h5>}
                {tag === 'h6' && <h6 className="text-gray-900 dark:text-white" style={{ fontSize: size, fontWeight: weight, lineHeight }}>{sample}</h6>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Body Text */}
      <div>
        <h3 className="text-2xl font-semibold mb-8 text-gray-900 dark:text-white">Body Text</h3>
        <div className="space-y-6">
          {bodyText.map(({ name, size, weight, lineHeight }) => (
            <div key={name} className="flex items-start gap-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="w-32 flex-shrink-0">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{size}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Weight: {weight}</p>
              </div>
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white" style={{ fontSize: size, fontWeight: weight, lineHeight }}>
                  The quick brown fox jumps over the lazy dog. This is sample text to demonstrate the typography scale
                  and how it appears in different contexts across the design system.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Font Stack */}
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Font Stack</h3>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
          <pre className="text-sm text-gray-900 dark:text-white font-mono">
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", 
            Roboto, "Helvetica Neue", Arial, sans-serif;
          </pre>
        </div>
      </div>
    </div>
  );
}
