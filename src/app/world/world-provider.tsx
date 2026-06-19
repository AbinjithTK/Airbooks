import {
  createContext,
  useContext,
  useMemo,
  useState,
  useRef,
  ReactNode,
} from 'react';
import { ThreeWorld } from './three-world';
import { WorldFallback } from './world-fallback';
import { hasWebGL, prefersReducedMotion } from './capabilities';
import type { SkyboxTheme } from '../types';
import { skyboxThemes } from '../themes/skybox-themes';

export type WorldView = 'login' | 'library' | 'reader' | 'writer';
export type WorldEnvironment = 'library-study' | 'green-meadow';

/** Resolved sky colors passed to the Three.js scene. */
export interface SkyColors {
  top: string;
  mid: string;
  bottom: string;
  fog: string;
  ambient: string;
  sun: string;
  sunIntensity: number;
}

interface WorldContextValue {
  currentView: WorldView;
  environment: WorldEnvironment;
  setView: (view: WorldView) => void;
  setEnvironment: (env: WorldEnvironment) => void;
  /** Active skybox theme key (or null for default meadow). */
  activeSkybox: SkyboxTheme | null;
  /** Set a skybox theme by key, or null to reset to default. */
  setActiveSkybox: (theme: SkyboxTheme | null) => void;
  /** Resolved sky colors derived from activeSkybox (null = default). */
  skyColors: SkyColors | null;
  /** True when the live WebGL world is rendering (false → CSS fallback). */
  enabled: boolean;
  reducedMotion: boolean;
}

const WorldContext = createContext<WorldContextValue | null>(null);

export function useWorld(): WorldContextValue {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld must be used within a WorldProvider');
  return ctx;
}

/** Resolve a skybox theme key into the concrete color values the 3D scene needs. */
function resolveSkyColors(theme: SkyboxTheme | null): SkyColors | null {
  if (!theme) return null;
  const cfg = skyboxThemes[theme];
  if (!cfg) return null;
  const [top, mid, bottom] = cfg.previewColors;
  return {
    top,
    mid,
    bottom,
    fog: cfg.fogColor,
    ambient: cfg.ambientLight,
    sun: cfg.directionalLight,
    sunIntensity: cfg.lightIntensity,
  };
}

// The world is rendered with VANILLA three.js (src/app/world/three/green-world.ts),
// NOT react-three-fiber. r3f's custom React reconciler crashes in the Figma Make
// runtime (host injects a second React → "reading 'fg'"), but plain three.js has
// no React dependency and runs fine. ThreeWorld falls back to a CSS ambient
// scene if WebGL is unavailable.

export function WorldProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<WorldView>('login');
  const [environment, setEnvironmentState] = useState<WorldEnvironment>('green-meadow');
  const [activeSkybox, setActiveSkybox] = useState<SkyboxTheme | null>(null);

  const skyColors = useMemo(() => resolveSkyColors(activeSkybox), [activeSkybox]);

  const caps = useRef<{ enabled: boolean; reducedMotion: boolean }>();
  if (!caps.current) {
    caps.current = { enabled: hasWebGL(), reducedMotion: prefersReducedMotion() };
  }
  const { enabled, reducedMotion } = caps.current;

  const value = useMemo<WorldContextValue>(
    () => ({
      currentView,
      environment,
      setView: setCurrentView,
      setEnvironment: setEnvironmentState,
      activeSkybox,
      setActiveSkybox,
      skyColors,
      enabled,
      reducedMotion,
    }),
    [currentView, environment, activeSkybox, skyColors, enabled, reducedMotion],
  );

  return (
    <WorldContext.Provider value={value}>
      {/* 3D world layer — ONLY visible when reading a book */}
      {(currentView === 'reader') && (
        <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
          {enabled ? (
            <ThreeWorld view={currentView} reducedMotion={reducedMotion} activeTheme={activeSkybox} />
          ) : (
            <WorldFallback reducedMotion={reducedMotion} />
          )}
        </div>
      )}

      {/* HTML overlay */}
      <div className="relative z-10">{children}</div>
    </WorldContext.Provider>
  );
}
