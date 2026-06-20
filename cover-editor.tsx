import { useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Upload, RotateCw, ZoomIn, ZoomOut, Move, Trash2, Check } from 'lucide-react';
import type { CoverImageTransform } from '../types';

interface CoverEditorProps {
  coverColor: string;
  coverImage: string | undefined;
  transform: CoverImageTransform;
  onImageChange: (url: string | undefined) => void;
  onTransformChange: (t: CoverImageTransform) => void;
  backCoverImage?: string | undefined;
  backTransform?: CoverImageTransform;
  onBackImageChange?: (url: string | undefined) => void;
  onBackTransformChange?: (t: CoverImageTransform) => void;
}

/**
 * Cover image editor — allows users to upload an image and position/scale/rotate
 * it on the book cover. Supports both front and back cover.
 */
export function CoverEditor({ coverColor, coverImage, transform, onImageChange, onTransformChange, backCoverImage, backTransform, onBackImageChange, onBackTransformChange }: CoverEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [face, setFace] = useState<'front' | 'back'>('front');
  const lastPos = useRef({ x: 0, y: 0 });

  // Current face data
  const activeImage = face === 'front' ? coverImage : backCoverImage;
  const activeTransform = face === 'front' ? transform : (backTransform || { x: 0, y: 0, scale: 1, rotation: 0 });
  const setActiveImage = face === 'front' ? onImageChange : (onBackImageChange || (() => {}));
  const setActiveTransform = face === 'front' ? onTransformChange : (onBackTransformChange || (() => {}));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setActiveImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setActiveImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Drag to reposition image
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!activeImage) return;
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [activeImage]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = (e.clientX - lastPos.current.x) * 0.3;
    const dy = (e.clientY - lastPos.current.y) * 0.3;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setActiveTransform({ ...activeTransform, x: activeTransform.x + dx, y: activeTransform.y + dy });
  }, [dragging, activeTransform, setActiveTransform]);

  const onPointerUp = useCallback(() => setDragging(false), []);

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: "'Fraunces', serif" }}>Cover Design</h3>

      {/* Front / Back toggle */}
      <div className="flex items-center gap-2 mb-4 p-1 rounded-xl bg-gray-100 w-fit">
        <button onClick={() => setFace('front')} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${face === 'front' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Front Cover</button>
        <button onClick={() => setFace('back')} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${face === 'back' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Back Cover</button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {/* Live cover preview with controls */}
      <div className="flex gap-6">
        {/* Preview area — clips image within cover */}
        <div
          className="relative w-48 h-64 rounded-xl overflow-hidden flex-shrink-0 cursor-move"
          style={{ background: `linear-gradient(145deg, ${coverColor}, ${adjustBrightness(coverColor, -25)})` }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {activeImage ? (
            <img
              src={activeImage}
              alt="Cover"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              style={{
                transform: `translate(${activeTransform.x}%, ${activeTransform.y}%) scale(${activeTransform.scale}) rotate(${activeTransform.rotation}deg)`,
                transformOrigin: 'center center',
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/30 rounded-xl m-2">
              <Upload className="w-6 h-6 text-white/50" />
              <span className="text-[10px] text-white/40 text-center px-4">Drop image or use upload button</span>
            </div>
          )}

          {/* Drag hint overlay when image exists */}
          {activeImage && !dragging && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
              <Move className="w-6 h-6 text-white/70" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3 flex-1">
          {/* Upload button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4" />
            {activeImage ? 'Replace Image' : 'Upload Image'}
          </motion.button>

          {activeImage && (
            <>
              {/* Scale controls */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Scale</label>
                <div className="flex items-center gap-2">
                  <ToolBtn icon={<ZoomOut className="w-3.5 h-3.5" />} onClick={() => setActiveTransform({ ...activeTransform, scale: Math.max(0.2, activeTransform.scale - 0.1) })} />
                  <input
                    type="range"
                    min="0.2" max="3" step="0.05"
                    value={activeTransform.scale}
                    onChange={(e) => setActiveTransform({ ...activeTransform, scale: parseFloat(e.target.value) })}
                    className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer"
                  />
                  <ToolBtn icon={<ZoomIn className="w-3.5 h-3.5" />} onClick={() => setActiveTransform({ ...activeTransform, scale: Math.min(3, activeTransform.scale + 0.1) })} />
                </div>
              </div>

              {/* Rotation controls */}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Rotation</label>
                <div className="flex items-center gap-2">
                  <ToolBtn icon={<RotateCw className="w-3.5 h-3.5" />} onClick={() => setActiveTransform({ ...activeTransform, rotation: activeTransform.rotation + 15 })} />
                  <input
                    type="range"
                    min="-180" max="180" step="1"
                    value={activeTransform.rotation}
                    onChange={(e) => setActiveTransform({ ...activeTransform, rotation: parseFloat(e.target.value) })}
                    className="flex-1 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-500 w-8 text-right">{Math.round(activeTransform.rotation)}°</span>
                </div>
              </div>

              {/* Reset + Remove */}
              <div className="flex gap-2 mt-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTransform({ x: 0, y: 0, scale: 1, rotation: 0 })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
                >
                  <Check className="w-3 h-3" /> Reset
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setActiveImage(undefined); setActiveTransform({ x: 0, y: 0, scale: 1, rotation: 0 }); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </motion.button>
              </div>
            </>
          )}

          {!activeImage && (
            <p className="text-xs text-gray-400 leading-relaxed">
              Upload an image to use as your book cover. You can drag to reposition, zoom in/out, and rotate it to fit perfectly.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon, onClick }: { icon: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer transition-colors"
    >
      {icon}
    </motion.button>
  );
}

function adjustBrightness(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0xff) + amt;
  const B = (num & 0xff) + amt;
  return '#' + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1);
}
