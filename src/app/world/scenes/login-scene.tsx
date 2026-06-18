import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LoginSceneProps {
  reducedMotion: boolean;
}

/** A single decorative book that floats and slowly rotates above the desk. */
export function LoginScene({ reducedMotion }: LoginSceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (reducedMotion || !groupRef.current) return;
    const time = performance.now() / 1000;
    groupRef.current.rotation.y = time * 0.2;
    groupRef.current.position.y = 1.8 + Math.sin(time * 0.5) * 0.08;
  });

  return (
    <>
      <spotLight
        position={[0, 4, 3]}
        angle={0.4}
        penumbra={0.8}
        intensity={1.5}
        color="#FFFFFF"
        castShadow
      />

      <group ref={groupRef} position={[0, 1.8, 0]}>
        {/* Front cover */}
        <mesh position={[0, 0, 0.03]} castShadow>
          <boxGeometry args={[1.0, 1.4, 0.02]} />
          <meshStandardMaterial color="#0F6FFF" metalness={0.2} roughness={0.5} />
        </mesh>
        {/* Back cover */}
        <mesh position={[0, 0, -0.03]} castShadow>
          <boxGeometry args={[1.0, 1.4, 0.02]} />
          <meshStandardMaterial color="#0F6FFF" metalness={0.2} roughness={0.5} />
        </mesh>
        {/* Spine */}
        <mesh position={[-0.5, 0, 0]} castShadow>
          <boxGeometry args={[0.08, 1.4, 0.06]} />
          <meshStandardMaterial color="#0A4FB8" metalness={0.2} roughness={0.5} />
        </mesh>
        {/* Page block */}
        <mesh>
          <boxGeometry args={[0.95, 1.35, 0.04]} />
          <meshStandardMaterial color="#F5F0E8" roughness={0.9} />
        </mesh>
      </group>
    </>
  );
}
