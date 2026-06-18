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

export type WorldView = 'login' | 'library' | 'reader' | 'writer';
export type WorldEnvironment = 'library-study' | 'green-meadow';

interface WorldContextValue {
  currentView: WorldView;
  environment: WorldEnvironment;
  setView: (view: WorldView) => void;
  setEnvironment: (env: WorldEnvironment) => void;
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

// The world is rendered with VANILLA three.js (src/app/world/three/green-world.ts),
// NOT react-three-fiber. r3f's custom React reconciler crashes in the Figma Make
// runtime (host injects a second React → "reading 'fg'"), but plain three.js has
// no React dependency and runs fine. ThreeWorld falls back to a CSS ambient
// scene if WebGL is unavailable.

export function WorldProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<WorldView>('login');
  const [environment, setEnvironmentState] = useState<WorldEnvironment>('green-meadow');

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
      enabled,
      reducedMotion,
    }),
    [currentView, environment, enabled, reducedMotion],
  );

  return (
    <WorldContext.Provider value={value}>
      {/* Persistent world layer (behind everything, non-interactive). */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        {enabled ? (
          <ThreeWorld view={currentView} reducedMotion={reducedMotion} />
        ) : (
          <WorldFallback reducedMotion={reducedMotion} />
        )}
      </div>

      {/* HTML overlay — all interactive app UI lives here, above the world. */}
      <div className="relative z-10">{children}</div>
    </WorldContext.Provider>
  );
}
