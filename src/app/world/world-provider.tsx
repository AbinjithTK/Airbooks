import {
  createContext,
  useContext,
  useMemo,
  useState,
  useRef,
  ReactNode,
} from 'react';
import { WorldFallback } from './world-fallback';
import { prefersReducedMotion } from './capabilities';

export type WorldView = 'login' | 'library' | 'reader' | 'writer';
export type WorldEnvironment = 'library-study';

interface WorldContextValue {
  currentView: WorldView;
  environment: WorldEnvironment;
  setView: (view: WorldView) => void;
  setEnvironment: (env: WorldEnvironment) => void;
  /** Whether the live WebGL scene is rendering (always false in this runtime). */
  enabled: boolean;
  reducedMotion: boolean;
}

const WorldContext = createContext<WorldContextValue | null>(null);

export function useWorld(): WorldContextValue {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error('useWorld must be used within a WorldProvider');
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────
// The live WebGL scene (react-three-fiber) is intentionally NOT imported or
// mounted here. It cannot initialize in the Figma Make runtime — the host
// injects a second React instance, so fiber's reconciler throws
// "Cannot read properties of undefined (reading 'fg')", and statically
// importing fiber also breaks the production build (unresolved
// "react-reconciler/constants"). So the immersive world is rendered with pure
// CSS (WorldFallback), which works identically in the editor preview and the
// published site.
//
// The full Three.js implementation still lives, unreferenced, under
// src/app/world/{world-scene,camera-rig,environments,scenes}. To use it, wire
// <WorldScene> back into a <Canvas> here — but only in a standalone build with
// a single React instance.
// ─────────────────────────────────────────────────────────────────────────

export function WorldProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<WorldView>('login');
  const [environment, setEnvironmentState] = useState<WorldEnvironment>('library-study');

  const caps = useRef<{ reducedMotion: boolean }>();
  if (!caps.current) {
    caps.current = { reducedMotion: prefersReducedMotion() };
  }
  const { reducedMotion } = caps.current;

  const value = useMemo<WorldContextValue>(
    () => ({
      currentView,
      environment,
      setView: setCurrentView,
      setEnvironment: setEnvironmentState,
      enabled: false,
      reducedMotion,
    }),
    [currentView, environment, reducedMotion],
  );

  return (
    <WorldContext.Provider value={value}>
      {/* Persistent CSS world (behind everything, non-interactive). */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <WorldFallback reducedMotion={reducedMotion} />
      </div>

      {/* HTML overlay — all interactive app UI lives here, above the world. */}
      <div className="relative z-10">{children}</div>
    </WorldContext.Provider>
  );
}
