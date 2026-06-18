import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const BOOK_COLORS = [
  '#8B0000', '#00308F', '#2E4600', '#4A0E4E',
  '#8B4513', '#1C1C1C', '#654321', '#191970',
];

interface LibraryStudyProps {
  reducedMotion: boolean;
}

/**
 * A warm, scholarly study room built from Three.js primitives: walls + a
 * reflective floor, a flickering desk lamp, a desk, two flanking bookshelves,
 * fog, and drifting dust motes.
 */
export function LibraryStudy({ reducedMotion }: LibraryStudyProps) {
  return (
    <group>
      <fog attach="fog" args={['#0a0500', 6, 18]} />

      {/* ── Lighting ── */}
      <ambientLight intensity={0.12} color="#FFE4C4" />
      <DeskLamp reducedMotion={reducedMotion} />
      <pointLight position={[3, 3, 2]} color="#B4D4FF" intensity={0.3} distance={12} decay={2} />

      {/* ── Room structure ── */}
      {/* Back wall */}
      <mesh position={[0, 2.5, -4]} receiveShadow>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#2C1810" roughness={0.9} />
      </mesh>

      {/* Floor (reflective) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={512}
          mixBlur={1}
          mixStrength={0.2}
          color="#1a0e05"
          roughness={0.8}
          depthScale={0.5}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
        />
      </mesh>

      {/* Subtle angled side walls */}
      <mesh position={[-5, 2.5, -1]} rotation={[0, Math.PI / 8, 0]}>
        <planeGeometry args={[8, 7]} />
        <meshStandardMaterial color="#241209" roughness={0.95} />
      </mesh>
      <mesh position={[5, 2.5, -1]} rotation={[0, -Math.PI / 8, 0]}>
        <planeGeometry args={[8, 7]} />
        <meshStandardMaterial color="#241209" roughness={0.95} />
      </mesh>

      {/* Moonlit window glow (back-right) */}
      <mesh position={[4, 2.5, -3.5]}>
        <planeGeometry args={[1.6, 2.4]} />
        <meshStandardMaterial
          color="#1b2a45"
          emissive="#3b5a8c"
          emissiveIntensity={0.6}
          roughness={1}
        />
      </mesh>

      {/* ── Furniture ── */}
      <Desk />
      <Bookshelf position={[-3.5, 0, -2.5]} />
      <Bookshelf position={[3.5, 0, -2.5]} />

      {/* ── Atmosphere ── */}
      {!reducedMotion && (
        <Sparkles
          count={60}
          scale={[8, 5, 8]}
          position={[0, 2, 0]}
          size={1.5}
          speed={0.15}
          opacity={0.25}
          color="#FFE4C4"
        />
      )}
    </group>
  );
}

function DeskLamp({ reducedMotion }: { reducedMotion: boolean }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (reducedMotion || !lightRef.current) return;
    const time = performance.now() / 1000;
    lightRef.current.intensity = 2.5 + Math.sin(time * 3) * 0.08;
  });

  return (
    <group position={[-1.5, 2.2, 0.5]}>
      <pointLight
        ref={lightRef}
        color="#FFD89B"
        intensity={2.5}
        distance={8}
        decay={2}
        castShadow
      />
      {/* Lamp shade */}
      <mesh>
        <coneGeometry args={[0.3, 0.4, 24, 1, true]} />
        <meshStandardMaterial
          color="#8B4513"
          emissive="#3a1a00"
          emissiveIntensity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Bulb */}
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#FFAA44" />
      </mesh>
    </group>
  );
}

function Desk() {
  return (
    <group position={[0, 0.8, 0.5]}>
      {/* Top */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.08, 1.2]} />
        <meshStandardMaterial color="#5C3317" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Legs */}
      {([
        [-1.15, -0.65, 0.5],
        [1.15, -0.65, 0.5],
        [-1.15, -0.65, -0.5],
        [1.15, -0.65, -0.5],
      ] as [number, number, number][]).map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.3, 12]} />
          <meshStandardMaterial color="#4A2810" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Bookshelf({ position }: { position: [number, number, number] }) {
  // Generate book layout once (stable across re-renders).
  const shelves = useMemo(() => {
    const heights = [1.0, 1.8, 2.6];
    return heights.map((y) => {
      const books: { x: number; h: number; w: number; color: string }[] = [];
      let x = -0.8;
      const count = 8 + Math.floor(Math.random() * 5); // 8–12
      for (let i = 0; i < count && x < 0.8; i++) {
        const w = 0.06 + Math.random() * 0.06;
        const h = 0.7 + Math.random() * 0.5;
        books.push({
          x: x + w / 2,
          h,
          w,
          color: BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)],
        });
        x += w + Math.random() * 0.04; // slight random gap
      }
      return { y, books };
    });
  }, []);

  return (
    <group position={position}>
      {shelves.map(({ y, books }, si) => (
        <group key={si}>
          {/* Plank */}
          <mesh position={[0, y, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, 0.04, 0.3]} />
            <meshStandardMaterial color="#3d2410" roughness={0.8} />
          </mesh>
          {/* Books resting on the plank */}
          {books.map((b, bi) => (
            <mesh key={bi} position={[b.x, y + 0.02 + b.h / 2, 0]} castShadow>
              <boxGeometry args={[b.w, b.h, 0.2]} />
              <meshStandardMaterial color={b.color} roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
