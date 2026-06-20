import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Book } from '../types';
import { skyboxThemes, type SkyboxTheme } from '../themes/skybox-themes';

interface BookReader3DProps {
  book: Book;
  /** Array of page image URLs or canvas-rendered text content */
  pages: string[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
  /** Active skybox theme (can change while reading) */
  activeSkybox?: SkyboxTheme | null;
}

/**
 * Full Three.js book reader — renders an open book (two facing pages)
 * inside the ambient 3D environment. The book opens with a smooth animation
 * from closed to flat-open. Page turns animate the right page flipping over.
 */
export function BookReader3D({ book, pages, currentPage, onPageChange, onClose, activeSkybox }: BookReader3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<OpenBookController | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    ctrlRef.current = createOpenBookScene(canvasRef.current, book);
    // Opening animation
    setTimeout(() => setReady(true), 100);
    return () => { ctrlRef.current?.dispose(); ctrlRef.current = null; };
  }, []);

  // Render pages when currentPage changes
  useEffect(() => {
    if (!ctrlRef.current) return;
    const leftIdx = currentPage * 2;
    const rightIdx = currentPage * 2 + 1;
    ctrlRef.current.setPages(
      pages[leftIdx] || '',
      pages[rightIdx] || '',
      leftIdx,
      rightIdx,
      pages.length
    );
  }, [currentPage, pages]);

  // Update environment when theme changes while reading
  useEffect(() => {
    if (!ctrlRef.current) return;
    ctrlRef.current.setTheme(activeSkybox ?? book.skyboxTheme ?? null);
  }, [activeSkybox]);

  const nextPage = () => {
    if (currentPage * 2 + 2 < pages.length) {
      ctrlRef.current?.flipPage('next');
      setTimeout(() => onPageChange(currentPage + 1), 400);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      ctrlRef.current?.flipPage('prev');
      setTimeout(() => onPageChange(currentPage - 1), 400);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      {/* 3D Canvas fills the screen */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* UI Overlay — floating controls */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Close button (top-right) */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          onClick={onClose}
          className="absolute top-6 right-6 pointer-events-auto w-11 h-11 rounded-2xl flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg cursor-pointer hover:bg-white transition-colors"
        >
          <X className="w-5 h-5 text-gray-700" />
        </motion.button>

        {/* Page navigation (bottom center) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 30 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 200, damping: 20 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={prevPage}
            disabled={currentPage === 0}
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </motion.button>

          <div className="px-4 py-2 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md">
            <span className="text-sm font-medium text-gray-700">
              {currentPage * 2 + 1}–{Math.min(currentPage * 2 + 2, pages.length)} / {pages.length}
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={nextPage}
            disabled={currentPage * 2 + 2 >= pages.length}
            className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </motion.button>
        </motion.div>

        {/* Book title (top-left) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute top-6 left-6 pointer-events-none"
        >
          <p className="text-sm font-semibold text-white/80 drop-shadow-lg">{book.title}</p>
          <p className="text-xs text-white/50">{book.author}</p>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Three.js Open Book Scene
   ═══════════════════════════════════════════════════════════════ */

interface OpenBookController {
  setPages(leftText: string, rightText: string, leftNum: number, rightNum: number, total: number): void;
  flipPage(direction: 'next' | 'prev'): void;
  setTheme(theme: SkyboxTheme | string | null): void;
  dispose(): void;
}

function createOpenBookScene(canvas: HTMLCanvasElement, book: Book): OpenBookController {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 4, 4);
  camera.lookAt(0, 0, 0);

  // ── Environment (from book's skybox theme) ──
  const theme = book.skyboxTheme ? skyboxThemes[book.skyboxTheme] : null;
  const bgColor = theme ? theme.fogColor : '#1a2332';
  scene.background = new THREE.Color(bgColor);
  scene.fog = new THREE.FogExp2(new THREE.Color(bgColor).getHex(), 0.04);

  // Lighting — warm reading light
  const ambientColor = theme ? theme.ambientLight : '#ffeedd';
  const sunColor = theme ? theme.directionalLight : '#fff4e0';
  scene.add(new THREE.AmbientLight(new THREE.Color(ambientColor), 0.5));
  const keyLight = new THREE.DirectionalLight(new THREE.Color(sunColor), 1.4);
  keyLight.position.set(2, 6, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  scene.add(new THREE.DirectionalLight(0xc8e0ff, 0.3).translateX(-3).translateY(3));

  // ── Particles (ambient dust/fireflies) ──
  const DUST = 200;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(DUST * 3);
  const dustSeeds = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 15;
    dustPos[i * 3 + 1] = Math.random() * 6;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    dustSeeds[i] = Math.random() * Math.PI * 2;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustColor = theme ? theme.accentColor : '#ffeedd';
  const dustMat = new THREE.PointsMaterial({ color: new THREE.Color(dustColor), size: 0.04, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  // ── Ground plane ──
  const groundColor = theme ? new THREE.Color(theme.fogColor).multiplyScalar(1.3) : new THREE.Color(0x2a1a0d);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Book Model ──
  const bookGroup = new THREE.Group();
  scene.add(bookGroup);
  bookGroup.position.y = 0;

  const PAGE_W = 1.8;
  const PAGE_H = 2.4;
  const COVER_THICK = 0.04;

  // Cover material
  const coverColor = new THREE.Color(book.coverColor);
  const coverMat = new THREE.MeshStandardMaterial({ color: coverColor, roughness: 0.5, metalness: 0.08 });
  const coverDarkMat = new THREE.MeshStandardMaterial({ color: coverColor.clone().multiplyScalar(0.7), roughness: 0.5 });

  // Spine
  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, PAGE_H, COVER_THICK * 3),
    coverDarkMat
  );
  spine.position.set(0, 0, 0);
  spine.castShadow = true;
  bookGroup.add(spine);

  // Left cover (opens to the left)
  const leftCover = new THREE.Mesh(
    new THREE.BoxGeometry(PAGE_W, PAGE_H, COVER_THICK),
    coverMat
  );
  leftCover.position.set(-PAGE_W / 2 - 0.03, 0, 0);
  leftCover.castShadow = true;
  bookGroup.add(leftCover);

  // Right cover (opens to the right)
  const rightCover = new THREE.Mesh(
    new THREE.BoxGeometry(PAGE_W, PAGE_H, COVER_THICK),
    coverMat
  );
  rightCover.position.set(PAGE_W / 2 + 0.03, 0, 0);
  rightCover.castShadow = true;
  bookGroup.add(rightCover);

  // ── Page surfaces (canvases for text) ──
  const leftCanvas = document.createElement('canvas');
  leftCanvas.width = 512; leftCanvas.height = 680;
  const leftTex = new THREE.CanvasTexture(leftCanvas);
  leftTex.colorSpace = THREE.SRGBColorSpace;

  const rightCanvas = document.createElement('canvas');
  rightCanvas.width = 512; rightCanvas.height = 680;
  const rightTex = new THREE.CanvasTexture(rightCanvas);
  rightTex.colorSpace = THREE.SRGBColorSpace;

  const pageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });

  const leftPage = new THREE.Mesh(
    new THREE.PlaneGeometry(PAGE_W * 0.92, PAGE_H * 0.92),
    new THREE.MeshStandardMaterial({ map: leftTex, roughness: 0.92 })
  );
  leftPage.position.set(-PAGE_W / 2 - 0.03, 0, COVER_THICK / 2 + 0.005);
  bookGroup.add(leftPage);

  const rightPage = new THREE.Mesh(
    new THREE.PlaneGeometry(PAGE_W * 0.92, PAGE_H * 0.92),
    new THREE.MeshStandardMaterial({ map: rightTex, roughness: 0.92 })
  );
  rightPage.position.set(PAGE_W / 2 + 0.03, 0, COVER_THICK / 2 + 0.005);
  bookGroup.add(rightPage);

  // ── Flipping page (animated plane that rotates on page turn) ──
  const flipGeo = new THREE.PlaneGeometry(PAGE_W * 0.9, PAGE_H * 0.9);
  const flipMat = new THREE.MeshStandardMaterial({ color: 0xFAF8F2, roughness: 0.9, side: THREE.DoubleSide });
  const flipPage = new THREE.Mesh(flipGeo, flipMat);
  flipPage.visible = false;
  // Pivot from left edge
  flipGeo.translate(PAGE_W * 0.45, 0, 0);
  flipPage.position.set(0, 0, COVER_THICK / 2 + 0.01);
  bookGroup.add(flipPage);

  // ── Open animation state ──
  let openProgress = 0; // 0 = closed, 1 = fully open
  let targetOpen = 1;
  let flipAngle = 0;
  let flipTarget = 0;
  let isFlipping = false;

  // Start closed, animate open
  bookGroup.rotation.x = -0.3;

  // Initial page render
  renderPageCanvas(leftCanvas, leftTex, '', 0, 0);
  renderPageCanvas(rightCanvas, rightTex, '', 0, 0);

  // Animation loop
  const clock = new THREE.Clock();
  let raf = 0;

  const tick = () => {
    const dt = Math.min(clock.getDelta(), 1 / 20);
    const t = clock.elapsedTime;

    // Smooth open animation
    openProgress += (targetOpen - openProgress) * dt * 2.5;
    const spread = openProgress * (PAGE_W + 0.06);
    leftCover.position.x = -spread / 2;
    rightCover.position.x = spread / 2;
    leftPage.position.x = -spread / 2;
    rightPage.position.x = spread / 2;

    // Book tilts flat as it opens
    bookGroup.rotation.x = -0.3 + openProgress * 0.3; // -0.3 → 0 (flat)

    // Camera eases back as book opens
    camera.position.y = 4 - openProgress * 1.5;
    camera.position.z = 4 + openProgress * 1;
    camera.lookAt(0, 0, 0);

    // Page flip animation
    if (isFlipping) {
      flipAngle += (flipTarget - flipAngle) * dt * 6;
      flipPage.rotation.y = flipAngle;
      if (Math.abs(flipAngle - flipTarget) < 0.02) {
        isFlipping = false;
        flipPage.visible = false;
        flipAngle = 0;
        flipPage.rotation.y = 0;
      }
    }

    // Particles
    const arr = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < DUST; i++) {
      let y = arr.getY(i) + dt * (0.04 + 0.03 * Math.sin(dustSeeds[i] + t * 0.15));
      let x = arr.getX(i) + Math.sin(t * 0.08 + dustSeeds[i]) * dt * 0.03;
      if (y > 6) { y = -0.5; x = (Math.random() - 0.5) * 15; }
      arr.setX(i, x); arr.setY(i, y);
    }
    arr.needsUpdate = true;

    // Dust opacity pulse
    dustMat.opacity = 0.4 + Math.sin(t * 0.6) * 0.1;

    // Gentle camera sway
    camera.position.x = Math.sin(t * 0.06) * 0.08;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(tick);

  return {
    setPages(leftText, rightText, leftNum, rightNum, total) {
      renderPageCanvas(leftCanvas, leftTex, leftText, leftNum + 1, total);
      renderPageCanvas(rightCanvas, rightTex, rightText, rightNum + 1, total);
    },

    flipPage(direction) {
      if (isFlipping) return;
      isFlipping = true;
      flipPage.visible = true;
      if (direction === 'next') {
        flipAngle = 0;
        flipTarget = -Math.PI;
      } else {
        flipAngle = -Math.PI;
        flipTarget = 0;
      }
    },

    setTheme(themeKey) {
      const t = themeKey ? skyboxThemes[themeKey as SkyboxTheme] : null;
      if (t) {
        // Smooth transition — lerp colors over time via target values
        scene.background = new THREE.Color(t.fogColor);
        (scene.fog as THREE.FogExp2).color.set(t.fogColor);
        keyLight.color.set(t.directionalLight);
        keyLight.intensity = t.lightIntensity * 1.2;
        dustMat.color.set(t.accentColor);
        ground.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(t.fogColor).multiplyScalar(1.3),
          roughness: 0.9,
        });
      } else {
        scene.background = new THREE.Color('#1a2332');
        (scene.fog as THREE.FogExp2).color.set('#1a2332');
        keyLight.color.set('#fff4e0');
        keyLight.intensity = 1.4;
        dustMat.color.set('#ffeedd');
      }
    },

    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      dustGeo.dispose(); dustMat.dispose();
      leftTex.dispose(); rightTex.dispose();
    },
  };
}

/* ─── Page canvas renderer ─── */
function renderPageCanvas(canvas: HTMLCanvasElement, tex: THREE.CanvasTexture, text: string, pageNum: number, totalPages: number) {
  const ctx = canvas.getContext('2d')!;

  // Paper background
  ctx.fillStyle = '#FAF8F2';
  ctx.fillRect(0, 0, 512, 680);

  // Subtle paper grain
  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(Math.random() * 512, Math.random() * 680, 1, 1);
  }
  ctx.globalAlpha = 1;

  if (!text && pageNum === 0) {
    // Empty page
    ctx.fillStyle = '#ccc';
    ctx.font = '14px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('', 256, 340);
  } else if (text) {
    // Render text content
    ctx.fillStyle = '#2a1a0d';
    ctx.font = '14px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lines = wrapTextToLines(ctx, text, 420);
    lines.forEach((line, i) => {
      if (i < 28) { // max lines per page
        ctx.fillText(line, 45, 50 + i * 22);
      }
    });
  }

  // Page number
  if (pageNum > 0) {
    ctx.fillStyle = '#999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${pageNum}`, 256, 650);
  }

  tex.needsUpdate = true;
}

function wrapTextToLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxW) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
