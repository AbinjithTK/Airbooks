import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import type { SkyboxTheme } from '../types';
import { skyboxThemes, skyboxThemeOrder } from '../themes/skybox-themes';

interface SkyboxPickerProps {
  value: SkyboxTheme | undefined;
  onChange: (theme: SkyboxTheme) => void;
}

export function SkyboxPicker({ value, onChange }: SkyboxPickerProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1A2332] dark:text-[#F1F5F9] mb-3">
        Reading Ambience
      </label>
      <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mb-4">
        Choose an immersive skybox environment for your reading sessions
      </p>
      <div className="grid grid-cols-4 gap-3">
        {skyboxThemeOrder.map((key) => {
          const theme = skyboxThemes[key];
          const selected = value === key;
          return (
            <SkyboxOrb
              key={key}
              themeKey={key}
              config={theme}
              selected={selected}
              onSelect={() => onChange(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SkyboxOrb({
  themeKey,
  config,
  selected,
  onSelect,
}: {
  themeKey: SkyboxTheme;
  config: (typeof skyboxThemes)[SkyboxTheme];
  selected: boolean;
  onSelect: () => void;
}) {
  const [top, mid, bottom] = config.previewColors;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
    >
      {/* 3D Sphere preview */}
      <div
        className="relative w-14 h-14 rounded-full overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${top} 0%, ${mid} 50%, ${bottom} 100%)`,
          boxShadow: selected
            ? `0 4px 20px -2px ${config.accentColor}80, 0 0 0 3px ${config.accentColor}, inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2)`
            : `0 4px 12px -2px rgba(0,0,0,0.2), inset 0 -4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.15)`,
          border: selected ? 'none' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Specular highlight — gives the sphere illusion */}
        <div
          className="absolute top-1 left-2 w-5 h-4 rounded-full opacity-60 group-hover:opacity-80 transition-opacity"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.7), transparent 70%)',
          }}
        />
        {/* Bottom reflection */}
        <div
          className="absolute bottom-0 left-0 right-0 h-4 opacity-30"
          style={{
            background: 'linear-gradient(to top, rgba(255,255,255,0.15), transparent)',
          }}
        />
        {/* Check overlay */}
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
          >
            <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center shadow-md">
              <Check className="w-3.5 h-3.5 text-[#0F6FFF]" strokeWidth={3} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Label */}
      <div className="text-center">
        <span className="text-[10px] leading-tight font-medium text-[#1A2332] dark:text-[#F1F5F9] block">
          {config.icon} {config.name}
        </span>
      </div>
    </motion.button>
  );
}
