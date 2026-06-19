import { useEffect, useRef, useState } from 'react';
import { createGreenWorld, GreenWorldController } from './three/green-world';
import { WorldFallback } from './world-fallback';
import type { WorldView } from './world-provider';
import type { SkyboxTheme } from '../types';

interface ThreeWorldProps {
  view: WorldView;
  reducedMotion: boolean;
  activeTheme: SkyboxTheme | null;
}

/**
 * Mounts the vanilla-three.js world on a canvas and keeps it in sync with
 * the current view and skybox theme.
 */
export function ThreeWorld({ view, reducedMotion, activeTheme }: ThreeWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<GreenWorldController | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const ctrl = createGreenWorld(canvasRef.current, { reducedMotion });
      ctrlRef.current = ctrl;
      // Apply initial theme immediately after creation
      ctrl.setView(view);
      ctrl.setTheme(activeTheme);
    } catch (e) {
      console.warn('[AirBooks world] three.js init failed:', e);
      setFailed(true);
    }
    return () => {
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => { ctrlRef.current?.setView(view); }, [view]);
  useEffect(() => { ctrlRef.current?.setTheme(activeTheme); }, [activeTheme]);

  if (failed) return <WorldFallback reducedMotion={reducedMotion} />;
  return <canvas ref={canvasRef} className="block w-full h-full" />;
}
