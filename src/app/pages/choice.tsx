import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Button3D } from '../components/ui/button-3d';
import * as THREE from 'three';

/**
 * Choice page — user decides between "Write a Book" (typewriter) and "Add PDF" (book).
 * Two 3D models side by side with hover glow + lift effects.
 */
export function ChoicePage() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<'write' | 'add' | null>(null);

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-[#fafafa]">
      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <Button3D variant="secondary" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/')}>
          Library
        </Button3D>
      </div>

      {/* Two choices — stack on mobile, side by side on desktop */}
      <div className="flex flex-col sm:flex-row items-center gap-10 sm:gap-16 md:gap-24">
        {/* ─── Write a Book ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.2 }}
          onMouseEnter={() => setHovered('write')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => navigate('/write/new')}
          className="cursor-pointer"
        >
          <motion.div
            animate={{
              y: hovered === 'write' ? -16 : [0, -6, 0],
              scale: hovered === 'write' ? 1.12 : 1,
            }}
            transition={hovered === 'write'
              ? { type: 'spring', stiffness: 300, damping: 18 }
              : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            <TypewriterMini hovered={hovered === 'write'} />
          </motion.div>
        </motion.div>

        {/* ─── Add PDF Book ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18, delay: 0.35 }}
          onMouseEnter={() => setHovered('add')}
          onMouseLeave={() => setHovered(null)}
          onClick={() => navigate('/create')}
          className="cursor-pointer"
        >
          <motion.div
            animate={{
              y: hovered === 'add' ? -16 : [0, -6, 0],
              scale: hovered === 'add' ? 1.12 : 1,
            }}
            transition={hovered === 'add'
              ? { type: 'spring', stiffness: 300, damping: 18 }
              : { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }
            }
          >
            <BookMini hovered={hovered === 'add'} />
          </motion.div>
        </motion.div>
      </div>

      {/* Subtle hint text below */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-sm text-gray-400"
      >
        {hovered === 'write' ? 'Write a new book' : hovered === 'add' ? 'Upload a PDF' : 'Choose your path'}
      </motion.p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Mini 3D Typewriter (Three.js in a small canvas)
   ═══════════════════════════════════════════════════ */
function TypewriterMini({ hovered }: { hovered: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; group: THREE.Group; camera: THREE.PerspectiveCamera; raf: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(280, 240);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 280 / 240, 0.1, 30);
    camera.position.set(0, 3.5, 4);
    camera.lookAt(0, 0.8, 0);

    scene.add(new THREE.AmbientLight(0xfff5e6, 0.6));
    const dl = new THREE.DirectionalLight(0xfff0d4, 1.5);
    dl.position.set(3, 6, 4); scene.add(dl);

    const group = new THREE.Group();
    scene.add(group);

    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7ecfb0, roughness: 0.35, metalness: 0.08 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.35, 1.8), bodyMat);
    base.position.y = 0.18; group.add(base);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.6), bodyMat);
    back.position.set(0, 0.9, -0.5); group.add(back);
    // Roller
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.8, 12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 }));
    roller.rotation.z = Math.PI / 2; roller.position.set(0, 0.9, -0.15); group.add(roller);
    // Paper
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.2), new THREE.MeshStandardMaterial({ color: 0xfaf8f2, roughness: 0.9 }));
    paper.position.set(0, 2.0, -0.55); paper.rotation.x = -0.05; group.add(paper);
    // Keys (rows of spheres)
    const keyMat = new THREE.MeshStandardMaterial({ color: 0xf8f4ea, roughness: 0.4 });
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8 - row; col++) {
        const key = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), keyMat);
        key.position.set(-0.9 + col * 0.25 + row * 0.06, 0.42, 0.3 + row * 0.28);
        group.add(key);
      }
    }

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const t = clock.elapsedTime;
      group.rotation.y = Math.sin(t * 0.5) * 0.08;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    sceneRef.current = { renderer, group, camera, raf };

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-[280px] h-[240px] rounded-3xl overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Mini 3D Book
   ═══════════════════════════════════════════════════ */
function BookMini({ hovered }: { hovered: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(280, 240);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 280 / 240, 0.1, 30);
    camera.position.set(0, 2, 4);
    camera.lookAt(0, 0.5, 0);

    scene.add(new THREE.AmbientLight(0xfff5e6, 0.6));
    const dl = new THREE.DirectionalLight(0xfff0d4, 1.5);
    dl.position.set(3, 6, 4); scene.add(dl);

    const group = new THREE.Group();
    scene.add(group);

    // Book cover
    const coverMat = new THREE.MeshStandardMaterial({ color: 0x0F6FFF, roughness: 0.45, metalness: 0.08 });
    const front = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.04), coverMat);
    front.position.z = 0.1; group.add(front);
    const backCover = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.04), coverMat);
    backCover.position.z = -0.1; group.add(backCover);
    // Pages
    const pages = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.95, 0.16), new THREE.MeshStandardMaterial({ color: 0xfaf5e8, roughness: 0.9 }));
    group.add(pages);
    // Spine
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.0, 0.2), new THREE.MeshStandardMaterial({ color: 0x0050CC, roughness: 0.4 }));
    spine.position.x = -0.72; group.add(spine);
    // Gold line
    const gold = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.01), new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 }));
    gold.position.set(0, 0.6, 0.12); group.add(gold);
    const gold2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.01), new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 }));
    gold2.position.set(0, -0.6, 0.12); group.add(gold2);

    group.rotation.x = 0.15;

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const t = clock.elapsedTime;
      group.rotation.y = Math.sin(t * 0.4) * 0.12 - 0.2;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); renderer.dispose(); };
  }, []);

  return (
    <div className="w-[280px] h-[240px] rounded-3xl overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
