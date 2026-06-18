import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { CameraRig } from './camera-rig';
import { EnvironmentRenderer } from './environments';
import { LoginScene } from './scenes/login-scene';
import { LibraryScene } from './scenes/library-scene';
import type { WorldView, WorldEnvironment } from './world-provider';

interface WorldSceneProps {
  currentView: WorldView;
  environment: WorldEnvironment;
  reducedMotion: boolean;
}

/**
 * Orchestrates the live 3D scene: the active environment, the camera rig,
 * view-specific content, and the post-processing stack.
 */
export function WorldScene({ currentView, environment, reducedMotion }: WorldSceneProps) {
  return (
    <>
      <EnvironmentRenderer environment={environment} reducedMotion={reducedMotion} />
      <CameraRig currentView={currentView} reducedMotion={reducedMotion} />

      {/* View-specific scene content */}
      {currentView === 'login' ? (
        <LoginScene reducedMotion={reducedMotion} />
      ) : (
        <LibraryScene />
      )}

      <EffectComposer>
        <Bloom luminanceThreshold={0.8} intensity={0.3} radius={0.6} mipmapBlur />
        <Vignette eskil={false} offset={0.15} darkness={0.5} />
      </EffectComposer>
    </>
  );
}
