import type { WorldEnvironment } from '../world-provider';
import { LibraryStudy } from './library-study';

interface EnvironmentRendererProps {
  environment: WorldEnvironment;
  reducedMotion: boolean;
}

/**
 * Renders the active 3D environment. Only "library-study" exists in Phase 1;
 * this registry is the single place to add more later.
 */
export function EnvironmentRenderer({ environment, reducedMotion }: EnvironmentRendererProps) {
  switch (environment) {
    case 'library-study':
    default:
      return <LibraryStudy reducedMotion={reducedMotion} />;
  }
}
