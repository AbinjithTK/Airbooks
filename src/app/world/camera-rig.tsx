import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { WorldView } from './world-provider';

interface ViewPose {
  position: [number, number, number];
  lookAt: [number, number, number];
}

// Predefined camera poses per view (from the Phase 1 plan).
const POSES: Record<WorldView, ViewPose> = {
  login: { position: [0, 2.5, 6], lookAt: [0, 1.5, 0] },
  library: { position: [0, 2.0, 4.5], lookAt: [0, 1.2, 0] },
  reader: { position: [0, 2.8, 2.2], lookAt: [0, 1.0, 0] },
  writer: { position: [0, 2.5, 2.5], lookAt: [0, 1.1, -0.3] },
};

interface CameraRigProps {
  currentView: WorldView;
  reducedMotion: boolean;
}

export function CameraRig({ currentView, reducedMotion }: CameraRigProps) {
  const { camera } = useThree();

  // Mutable targets we lerp toward each frame.
  const targetPos = useRef(new THREE.Vector3(...POSES[currentView].position));
  const targetLook = useRef(new THREE.Vector3(...POSES[currentView].lookAt));
  const currentLook = useRef(new THREE.Vector3(...POSES[currentView].lookAt));

  useFrame((_, delta) => {
    const pose = POSES[currentView];
    targetPos.current.set(...pose.position);
    targetLook.current.set(...pose.lookAt);

    // Clamp the lerp factor so large delta spikes (tab refocus) don't snap.
    const t = Math.min(1, delta * 1.2);

    camera.position.lerp(targetPos.current, t);
    currentLook.current.lerp(targetLook.current, t);

    // Subtle breathing drift to keep the world feeling alive.
    if (!reducedMotion) {
      const time = performance.now() / 1000;
      camera.position.x += Math.sin(time * 0.15) * 0.015;
      camera.position.y += Math.cos(time * 0.12) * 0.008;
    }

    camera.lookAt(currentLook.current);
  });

  return null;
}
