import { useEffect, useRef, useState } from 'react';
import { createGreenWorld, GreenWorldController } from './three/green-world';
import { WorldFallback } from './world-fallback';
import type { WorldView } from './world-provider';

interface ThreeWorldProps {
  view: WorldView;
  reducedMotion: boolean;
}

/**
 * Mounts the vanilla-three.js green world on a canvas and keeps it in sync with
 * the current view. If three.js can't initialize (no WebGL, lost context, etc.)
 * it degrades to the pure-CSS ambient world so the app never breaks.
 */
export function ThreeWorld({ view, reducedMotion }: ThreeWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<GreenWorldController | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      ctrlRef.current = createGreenWorld(canvasRef.current, { reducedMotion });
      console.log('[AirBooks world] three.js green meadow active ✓');
    } catch (e) {
      console.warn('[AirBooks world] three.js init failed, using CSS fallback:', e);
      setFailed(true);
    }
    return () => {
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    ctrlRef.current?.setView(view);
  }, [view]);

  if (failed) return <WorldFallback reducedMotion={reducedMotion} />;

  return <canvas ref={canvasRef} className="block w-full h-full" />;
}
