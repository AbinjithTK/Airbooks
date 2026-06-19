import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, X, Check } from 'lucide-react';
import type { SkyboxTheme } from '../types';
import { skyboxThemes, skyboxThemeOrder } from '../themes/skybox-themes';
import { useWorld } from '../world/world-provider';

interface ReaderThemePickerProps {
  /** Current book's skybox (initial selection). */
  bookSkybox?: SkyboxTheme;
  /** Called when user picks a theme — persists to book. */
  onSelect: (theme: SkyboxTheme) => void;
}

/**
 * Floating in-reader theme picker — a small toggle that expands into a radial
 * orb selector. Picking a skybox instantly updates the 3D world behind the reader.
 * Designed to feel like a game settings wheel, not a flat dropdown.
 */
export function ReaderThemePicker({ bookSkybox, onSelect }: ReaderThemePickerProps) {
  const [open, setOpen] = useState(false);
  const { activeSkybox, setActiveSkybox } = useWorld();

  const current = activeSkybox ?? bookSkybox ?? null;

  const handlePick = (theme: SkyboxTheme) => {
    setActiveSkybox(theme);
    onSelect(theme);
    setOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            key="picker"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="absolute bottom-16 right-0 p-4 rounded-2xl"
            style={{
              background: 'linear-gradient(145deg, rgba(30,20,10,0.95), rgba(15,10,5,0.98))',
              boxShadow: `
                0 20px 50px -10px rgba(0,0,0,0.6),
                0 8px 20px -5px rgba(0,0,0,0.4),
                inset 0 1px 1px rgba(255,200,100,0.08),
                inset 0 -1px 2px rgba(0,0,0,0.3)
              `,
              border: '1px solid rgba(255,200,100,0.1)',
              backdropFilter: 'blur(12px)',
              minWidth: 240,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-200/70">
                Reading Ambience
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpen(false)}
                className="p-1 rounded-full text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* Orb grid */}
            <div className="grid grid-cols-4 gap-3">
              {skyboxThemeOrder.map((key, i) => {
                const theme = skyboxThemes[key];
                const selected = current === key;
                const [top, mid, bottom] = theme.previewColors;

                return (
                  <motion.button
                    key={key}
                    type="button"
                    onClick={() => handlePick(key)}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 20 }}
                    whileHover={{ scale: 1.15, y: -3 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none group"
                  >
                    {/* Orb */}
                    <div
                      className="relative w-11 h-11 rounded-full overflow-hidden"
                      style={{
                        background: `linear-gradient(145deg, ${top} 0%, ${mid} 50%, ${bottom} 100%)`,
                        boxShadow: selected
                          ? `0 0 0 2.5px ${theme.accentColor}, 0 4px 14px -2px ${theme.accentColor}60, inset 0 -3px 6px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.2)`
                          : `0 3px 10px -2px rgba(0,0,0,0.4), inset 0 -3px 6px rgba(0,0,0,0.35), inset 0 2px 3px rgba(255,255,255,0.15)`,
                        border: selected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {/* Specular */}
                      <div
                        className="absolute top-1 left-1.5 w-4 h-3 rounded-full opacity-50 group-hover:opacity-70 transition-opacity"
                        style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.7), transparent 70%)' }}
                      />
                      {/* Check */}
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]"
                        >
                          <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 text-[#0F6FFF]" strokeWidth={3} />
                          </div>
                        </motion.div>
                      )}
                    </div>
                    {/* Label */}
                    <span className="text-[9px] font-medium text-white/50 group-hover:text-white/80 transition-colors leading-tight text-center">
                      {theme.icon}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button — 3D floating orb */}
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="relative w-12 h-12 rounded-full flex items-center justify-center cursor-pointer focus:outline-none"
        style={{
          background: open
            ? 'linear-gradient(145deg, #3B82F6, #0F6FFF)'
            : 'linear-gradient(145deg, rgba(60,40,20,0.9), rgba(30,18,8,0.95))',
          boxShadow: open
            ? '0 6px 20px -4px rgba(59,130,246,0.5), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.2)'
            : '0 6px 20px -4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,200,100,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)',
          border: open ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,200,100,0.1)',
        }}
        aria-label="Change reading ambience"
      >
        <Palette className="w-5 h-5 text-white/80" />
        {/* Glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          animate={{ opacity: open ? 0.4 : 0 }}
          style={{ boxShadow: '0 0 15px 3px rgba(59,130,246,0.4)' }}
        />
      </motion.button>
    </div>
  );
}
