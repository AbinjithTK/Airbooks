import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { SkyboxTheme } from '../types';
import { skyboxThemes } from '../themes/skybox-themes';

interface Book3DCanvasProps {
  color: string;
  title: string;
  author: string;
  category?: string;
  step?: number;
  zoom?: number;
  interactive?: boolean;
  skyboxTheme?: SkyboxTheme;
}

/* ─── Step-based camera targets (car customizer feel) ─── */
const STEP_ANGLES: Record<number, { rx: number; ry: number }> = {
  0: { rx: 0.08, ry: -0.4 },   // Upload: angled front
  1: { rx: 0.0, ry: 0.0 },     // Details: straight on
  2: { rx: 0.1, ry: 0.55 },    // Theme: show spine
  3: { rx: -0.06, ry: -0.25 }, // Preview: hero shot
};

/**
 * A polished 3D book rendered with Three.js — rounded edges via ExtrudeGeometry,
 * PBR materials, gold foil text, soft studio lighting, interactive orbit, and
 * step-based cinematic camera angles. Replaces the CSS 3D fallback.
 */
export function Book3DCanvas({
  color,
  title,
  author,
  category,
  step = 0,
  zoom = 1,
  interactive = true,
  skyboxTheme,
}: Book3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<BookSceneController | null>(null);
  const [failed, setFailed] = useState(false);

  // Init scene
  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      ctrlRef.current = createBookScene(canvasRef.current);
    } catch (e) {
      console.warn('[Book3DCanvas] init failed:', e);
      setFailed(true);
    }
    return () => {
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
    };
  }, []);

  // Update properties
  useEffect(() => { ctrlRef.current?.setColor(color); }, [color]);
  useEffect(() => { ctrlRef.current?.setText(title, author, category); }, [title, author, category]);
  useEffect(() => { ctrlRef.current?.setStep(step); }, [step]);
  useEffect(() => { ctrlRef.current?.setZoom(zoom); }, [zoom]);
  useEffect(() => { ctrlRef.current?.setEnvironment(skyboxTheme ?? null); }, [skyboxTheme]);

  // Pointer orbit
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return;
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [interactive]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !interactive) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    ctrlRef.current?.orbit(dx * 0.005, -dy * 0.004);
  }, [interactive]);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!interactive) return;
    e.preventDefault();
    ctrlRef.current?.adjustZoom(-e.deltaY * 0.001);
  }, [interactive]);

  if (failed) return null; // parent can fall back to CSS version

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   Three.js Book Scene
   ═══════════════════════════════════════════════════════════════ */

interface BookSceneController {
  setColor(hex: string): void;
  setText(title: string, author: string, category?: string): void;
  setStep(step: number): void;
  setZoom(z: number): void;
  setEnvironment(theme: string | null): void;
  orbit(dx: number, dy: number): void;
  adjustZoom(dz: number): void;
  dispose(): void;
}

function createBookScene(canvas: HTMLCanvasElement): BookSceneController {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.set(0, 0, 5);

  // ── Studio Lighting ──
  const ambient = new THREE.AmbientLight(0xffeedd, 0.4);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.8);
  keyLight.position.set(3, 5, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(512, 512);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc8e0ff, 0.6);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffd4a0, 0.5);
  rimLight.position.set(0, -1, -4);
  scene.add(rimLight);

  // Subtle environment for reflections
  const envTex = createEnvMap();
  scene.environment = envTex;

  // ── Book group ──
  const bookGroup = new THREE.Group();
  scene.add(bookGroup);

  // Book dimensions
  const W = 1.5;  // width
  const H = 2.1;  // height
  const D = 0.18; // depth (thickness)
  const R = 0.04; // corner radius

  // ── Cover geometry (rounded box via ExtrudeGeometry) ──
  const coverShape = createRoundedRectShape(W, H, R);
  const coverExtrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 3,
  };
  const coverGeo = new THREE.ExtrudeGeometry(coverShape, coverExtrudeSettings);
  coverGeo.center();

  // Front cover material — leather-like PBR
  const coverMat = new THREE.MeshStandardMaterial({
    color: 0x0F6FFF,
    roughness: 0.55,
    metalness: 0.05,
    envMapIntensity: 0.4,
  });

  const frontCover = new THREE.Mesh(coverGeo, coverMat);
  frontCover.position.z = D / 2;
  frontCover.castShadow = true;
  bookGroup.add(frontCover);

  // Back cover
  const backCover = new THREE.Mesh(coverGeo, coverMat.clone());
  backCover.position.z = -D / 2;
  backCover.rotation.y = Math.PI;
  backCover.castShadow = true;
  bookGroup.add(backCover);

  // ── Spine (rounded cylinder feel) ──
  const spineShape = createRoundedRectShape(D, H, R * 0.5);
  const spineGeo = new THREE.ExtrudeGeometry(spineShape, {
    depth: 0.015,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
  spineGeo.center();
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0x0050CC,
    roughness: 0.6,
    metalness: 0.08,
    envMapIntensity: 0.3,
  });
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.rotation.y = Math.PI / 2;
  spine.position.x = -W / 2 - 0.007;
  spine.castShadow = true;
  bookGroup.add(spine);

  // ── Pages block (cream-colored) ──
  const pagesShape = createRoundedRectShape(W * 0.97, H * 0.96, R * 0.3);
  const pagesGeo = new THREE.ExtrudeGeometry(pagesShape, {
    depth: D * 0.85,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 1,
  });
  pagesGeo.center();
  const pagesMat = new THREE.MeshStandardMaterial({
    color: 0xFAF5E8,
    roughness: 0.95,
    metalness: 0,
  });
  const pages = new THREE.Mesh(pagesGeo, pagesMat);
  pages.castShadow = true;
  pages.receiveShadow = true;
  bookGroup.add(pages);

  // Page edge lines texture (procedural)
  addPageEdgeLines(pages, W, H, D);

  // ── Gold foil title text (plane with canvas texture) ──
  const textCanvas = document.createElement('canvas');
  textCanvas.width = 512;
  textCanvas.height = 712;
  const textTex = new THREE.CanvasTexture(textCanvas);
  textTex.colorSpace = THREE.SRGBColorSpace;
  const textMat = new THREE.MeshStandardMaterial({
    map: textTex,
    transparent: true,
    roughness: 0.3,
    metalness: 0.6,
    envMapIntensity: 0.8,
  });
  const textPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 0.85, H * 0.85),
    textMat,
  );
  textPlane.position.z = D / 2 + 0.022;
  bookGroup.add(textPlane);

  // ── Decorative emboss lines on cover ──
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xFFD700,
    roughness: 0.25,
    metalness: 0.85,
    envMapIntensity: 1.0,
  });
  const frameGeo = createFrameGeometry(W * 0.8, H * 0.8, 0.012, R * 0.5);
  const frame = new THREE.Mesh(frameGeo, lineMat);
  frame.position.z = D / 2 + 0.021;
  bookGroup.add(frame);

  // ── Floor shadow catcher ──
  const shadowGeo = new THREE.PlaneGeometry(4, 4);
  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.15 });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -H / 2 - 0.3;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // ── Animation state ──
  let targetRY = STEP_ANGLES[0].ry;
  let targetRX = STEP_ANGLES[0].rx;
  let currentRY = targetRY;
  let currentRX = targetRX;
  let targetZoom = 1.0;
  let currentZoom = 1.0;
  const clock = new THREE.Clock();
  let raf = 0;

  function renderText(t: string, a: string, cat?: string) {
    const ctx = textCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 712);

    // Title
    ctx.fillStyle = 'rgba(255, 248, 220, 0.95)';
    ctx.font = 'bold 38px "Georgia", serif';
    ctx.textAlign = 'center';
    wrapText(ctx, t || 'Untitled', 256, 280, 380, 46);

    // Divider
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(170, 420);
    ctx.lineTo(342, 420);
    ctx.stroke();

    // Author
    ctx.fillStyle = 'rgba(255, 240, 200, 0.7)';
    ctx.font = '22px "Georgia", serif';
    ctx.fillText(a || 'Author', 256, 465);

    // Category
    if (cat) {
      ctx.fillStyle = 'rgba(255, 240, 200, 0.35)';
      ctx.font = '14px sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText(cat.toUpperCase(), 256, 600);
    }

    textTex.needsUpdate = true;
  }

  function setColor(hex: string) {
    const c = new THREE.Color(hex);
    coverMat.color.copy(c);
    (backCover.material as THREE.MeshStandardMaterial).color.copy(c);
    const darker = c.clone().multiplyScalar(0.7);
    spineMat.color.copy(darker);
  }

  renderText('', '', '');

  // Frame loop
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 1 / 20);

    // Smooth lerp
    const ease = 1 - Math.exp(-3.5 * dt);
    currentRY += (targetRY - currentRY) * ease;
    currentRX += (targetRX - currentRX) * ease;
    currentZoom += (targetZoom - currentZoom) * ease;

    // Subtle idle float
    const t = clock.elapsedTime;
    const floatY = Math.sin(t * 0.8) * 0.015;
    const floatR = Math.sin(t * 0.5) * 0.008;

    bookGroup.rotation.y = currentRY + floatR;
    bookGroup.rotation.x = currentRX;
    bookGroup.position.y = floatY;

    camera.position.z = 4.5 / currentZoom;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  const resize = () => {
    const w = canvas.clientWidth || 400;
    const h = canvas.clientHeight || 500;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(tick);

  return {
    setColor,
    setText(t, a, cat) { renderText(t, a, cat); },
    setStep(s) {
      const angles = STEP_ANGLES[s] ?? STEP_ANGLES[0];
      targetRY = angles.ry;
      targetRX = angles.rx;
    },
    setZoom(z) { targetZoom = Math.max(0.6, Math.min(1.8, z)); },
    setEnvironment(theme) {
      // Remove previous environment group
      const oldEnv = scene.getObjectByName('__env__');
      if (oldEnv) { scene.remove(oldEnv); disposeGroup(oldEnv as THREE.Group); }

      if (!theme) {
        // Default: transparent background, warm studio lighting
        scene.background = null;
        scene.fog = null;
        ambient.color.set(0xffeedd); ambient.intensity = 0.4;
        keyLight.color.set(0xfff4e0); keyLight.intensity = 1.8;
        fillLight.color.set(0xc8e0ff); fillLight.intensity = 0.6;
        rimLight.color.set(0xffd4a0); rimLight.intensity = 0.5;
        return;
      }

      const cfg = skyboxThemes[theme as SkyboxTheme];
      if (!cfg) return;

      // Set lighting from theme
      scene.background = new THREE.Color(cfg.fogColor);
      scene.fog = new THREE.FogExp2(new THREE.Color(cfg.fogColor).getHex(), 0.06);
      ambient.color.set(cfg.ambientLight); ambient.intensity = 0.5;
      keyLight.color.set(cfg.directionalLight); keyLight.intensity = cfg.lightIntensity * 1.4;
      fillLight.color.set(cfg.accentColor); fillLight.intensity = 0.5;
      rimLight.color.set(cfg.ambientLight); rimLight.intensity = 0.3;

      // Build full 3D environment
      const envGroup = buildEnvironment3D(theme as string);
      envGroup.name = '__env__';
      scene.add(envGroup);
    },
    orbit(dx, dy) {
      targetRY += dx;
      targetRX = Math.max(-0.5, Math.min(0.5, targetRX + dy));
    },
    adjustZoom(dz) { targetZoom = Math.max(0.6, Math.min(1.8, targetZoom + dz)); },
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      envTex.dispose();
      coverGeo.dispose(); spineGeo.dispose(); pagesGeo.dispose();
      coverMat.dispose(); spineMat.dispose(); pagesMat.dispose();
      textTex.dispose(); textMat.dispose(); lineMat.dispose();
    },
  };
}

/* ═══════ Geometry Helpers ═══════ */

function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

function createFrameGeometry(w: number, h: number, thickness: number, r: number): THREE.BufferGeometry {
  const outer = createRoundedRectShape(w, h, r);
  const inner = createRoundedRectShape(w - thickness * 2, h - thickness * 2, r * 0.7);
  outer.holes.push(inner as unknown as THREE.Path);
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: 0.003,
    bevelEnabled: false,
  });
  geo.center();
  return geo;
}

function addPageEdgeLines(mesh: THREE.Mesh, w: number, h: number, d: number) {
  // Add subtle horizontal lines on the right edge to simulate page layers
  const lineGeo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const count = 20;
  for (let i = 0; i < count; i++) {
    const z = -d * 0.4 + (d * 0.8 * i) / count;
    positions.push(w * 0.48, -h * 0.45, z);
    positions.push(w * 0.48, h * 0.45, z);
  }
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0xD4C8B0, transparent: true, opacity: 0.3 });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  mesh.add(lines);
}

/** Simple gradient env map for subtle reflections */
function createEnvMap(): THREE.Texture {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const t = y / size;
      // Warm gradient: dark at bottom, warm cream at top
      data[i] = Math.floor(40 + t * 80);     // R
      data[i + 1] = Math.floor(25 + t * 55);   // G
      data[i + 2] = Math.floor(15 + t * 40);   // B
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  return tex;
}

/** Word-wrap helper for canvas text */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cy);
}


/* ═══════ 3D Environment Builders ═══════ */

function disposeGroup(group: THREE.Group) {
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
    if ((obj as THREE.Mesh).material) {
      const mat = (obj as THREE.Mesh).material;
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else mat.dispose();
    }
  });
}

function buildEnvironment3D(theme: string): THREE.Group {
  switch (theme) {
    case 'forest': return buildForestEnv();
    case 'ocean': return buildOceanEnv();
    case 'sunset': return buildSunsetEnv();
    case 'night-sky': return buildNightEnv();
    case 'cozy-cabin': return buildCabinEnv();
    case 'library': return buildLibraryEnv();
    case 'arctic': return buildArcticEnv();
    case 'sakura': return buildSakuraEnv();
    default: return new THREE.Group();
  }
}

function buildForestEnv(): THREE.Group {
  const g = new THREE.Group();
  // Ground
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(8, 32),
    new THREE.MeshStandardMaterial({ color: 0x2d6b1e, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.8; ground.receiveShadow = true; g.add(ground);
  // Trees (low-poly cones + cylinders)
  const tGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.8, 6);
  const fGeo = new THREE.ConeGeometry(0.4, 1.2, 8);
  const greens = [0x2d8a22, 0x3fa834, 0x1a6b15, 0x4db83a];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
    const r = 2.5 + Math.random() * 3;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const s = 0.5 + Math.random() * 1;
    const trunk = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ color: 0x5c3d20, roughness: 1 }));
    trunk.position.set(x, -1.8 + 0.4 * s, z); trunk.scale.setScalar(s); g.add(trunk);
    const foliage = new THREE.Mesh(fGeo, new THREE.MeshStandardMaterial({ color: greens[i % 4], roughness: 0.8 }));
    foliage.position.set(x, -1.8 + 1.1 * s, z); foliage.scale.set(s, s * 1.2, s); foliage.castShadow = true; g.add(foliage);
  }
  // Mushrooms
  const mCap = new THREE.SphereGeometry(0.08, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const mStem = new THREE.CylinderGeometry(0.02, 0.03, 0.1, 6);
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, r2 = 1 + Math.random() * 2;
    const cap = new THREE.Mesh(mCap, new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.6 }));
    cap.position.set(Math.cos(a) * r2, -1.75, Math.sin(a) * r2); g.add(cap);
    const stem = new THREE.Mesh(mStem, new THREE.MeshStandardMaterial({ color: 0xfff8e0, roughness: 0.8 }));
    stem.position.set(Math.cos(a) * r2, -1.8, Math.sin(a) * r2); g.add(stem);
  }
  return g;
}

function buildOceanEnv(): THREE.Group {
  const g = new THREE.Group();
  // Wavy ocean floor
  const floorGeo = new THREE.PlaneGeometry(12, 12, 24, 24);
  const fp = floorGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i), y = fp.getY(i);
    fp.setZ(i, Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.2);
  }
  floorGeo.computeVertexNormals();
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x1a5f7a, roughness: 0.6, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2; floor.receiveShadow = true; g.add(floor);
  // Coral
  const coralColors = [0xff6b6b, 0xff9f43, 0x48dbfb, 0x10ac84, 0xee5a24];
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3.5;
    const geo = Math.random() > 0.5 ? new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 8, 6) : new THREE.CylinderGeometry(0.05, 0.12, 0.5 + Math.random() * 0.5, 6);
    const coral = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: coralColors[i % 5], roughness: 0.5, metalness: 0.1 }));
    coral.position.set(Math.cos(a) * r, -1.8 + Math.random() * 0.3, Math.sin(a) * r);
    coral.rotation.set(Math.random() * 0.3, 0, Math.random() * 0.3); coral.castShadow = true; g.add(coral);
  }
  // Bubbles (small translucent spheres)
  const bubGeo = new THREE.SphereGeometry(0.04, 8, 6);
  const bubMat = new THREE.MeshStandardMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.3 });
  for (let i = 0; i < 20; i++) {
    const b = new THREE.Mesh(bubGeo, bubMat);
    b.position.set((Math.random() - 0.5) * 5, -1.5 + Math.random() * 3, (Math.random() - 0.5) * 5);
    b.scale.setScalar(0.5 + Math.random() * 1.5); g.add(b);
  }
  return g;
}

function buildSunsetEnv(): THREE.Group {
  const g = new THREE.Group();
  // Desert ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshStandardMaterial({ color: 0xc2956b, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.8; ground.receiveShadow = true; g.add(ground);
  // Sand dunes
  for (let i = 0; i < 6; i++) {
    const dune = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random(), 12, 8), new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.95 }));
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 3;
    dune.position.set(Math.cos(a) * r, -2.2, Math.sin(a) * r);
    dune.scale.set(1, 0.25 + Math.random() * 0.2, 1); g.add(dune);
  }
  // Cacti
  const cactGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8);
  for (let i = 0; i < 5; i++) {
    const c = new THREE.Mesh(cactGeo, new THREE.MeshStandardMaterial({ color: 0x4a7c3f, roughness: 0.8 }));
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 3;
    c.position.set(Math.cos(a) * r, -1.45, Math.sin(a) * r); c.castShadow = true; g.add(c);
    // Arms
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x4a7c3f }));
    arm.position.set(Math.cos(a) * r + 0.12, -1.35, Math.sin(a) * r); arm.rotation.z = Math.PI / 3; g.add(arm);
  }
  // Sun disc (glowing sphere on horizon)
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xffa000, emissiveIntensity: 1.5, roughness: 0.1 }));
  sun.position.set(0, -0.5, -5); g.add(sun);
  return g;
}

function buildNightEnv(): THREE.Group {
  const g = new THREE.Group();
  // Dark ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshStandardMaterial({ color: 0x0a0520, roughness: 0.9, metalness: 0.1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.8; ground.receiveShadow = true; g.add(ground);
  // Stars (small emissive spheres)
  const starGeo = new THREE.SphereGeometry(0.02, 4, 4);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 80; i++) {
    const s = new THREE.Mesh(starGeo, starMat);
    s.position.set((Math.random() - 0.5) * 12, 1 + Math.random() * 5, (Math.random() - 0.5) * 12 - 3);
    g.add(s);
  }
  // Glowing crystal pillars
  const pillarGeo = new THREE.CylinderGeometry(0.08, 0.15, 1.2, 6);
  const pillarColors = [0x6366f1, 0x8b5cf6, 0xa78bfa, 0x4f46e5];
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 3;
    const p = new THREE.Mesh(pillarGeo, new THREE.MeshStandardMaterial({ color: pillarColors[i % 4], emissive: pillarColors[i % 4], emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2 }));
    p.position.set(Math.cos(a) * r, -1.2, Math.sin(a) * r);
    p.scale.set(0.5 + Math.random() * 0.7, 0.8 + Math.random() * 1, 0.5 + Math.random() * 0.7); p.castShadow = true; g.add(p);
  }
  // Moon
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe0e7ff, emissive: 0xc4b5fd, emissiveIntensity: 0.8, roughness: 0.3 }));
  moon.position.set(2, 3, -4); g.add(moon);
  return g;
}

function buildCabinEnv(): THREE.Group {
  const g = new THREE.Group();
  // Wood floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.8; floor.receiveShadow = true; g.add(floor);
  // Back wall
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshStandardMaterial({ color: 0x3d2211, roughness: 0.9 }));
  wall.position.set(0, 0.7, -4); g.add(wall);
  // Fireplace
  const fpBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: 0.9 }));
  fpBase.position.set(0, -0.9, -3.8); g.add(fpBase);
  const fire = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2, roughness: 0.2 }));
  fire.position.set(0, -1.3, -3.6); g.add(fire);
  const fire2 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 1.5, roughness: 0.3 }));
  fire2.position.set(0.1, -1.1, -3.6); g.add(fire2);
  // Rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2; rug.position.y = -1.79; g.add(rug);
  // Candles
  for (let i = 0; i < 3; i++) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xfff8e0 }));
    candle.position.set(-1.5 + i * 1.5, -0.5, -3.5); g.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 2 }));
    flame.position.set(-1.5 + i * 1.5, -0.35, -3.5); g.add(flame);
  }
  return g;
}

function buildLibraryEnv(): THREE.Group {
  const g = new THREE.Group();
  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.8; floor.receiveShadow = true; g.add(floor);
  // Shelves with books on back wall
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.7, metalness: 0.08 });
  const bookColors = [0x8B0000, 0x006400, 0x00008B, 0x8B4513, 0x4B0082, 0xDAA520, 0x191970];
  for (let row = 0; row < 3; row++) {
    const y = -1.2 + row * 1.1;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(5, 0.05, 0.35), shelfMat);
    shelf.position.set(0, y, -3.5); g.add(shelf);
    // Books
    let cursor = -2.3;
    for (let b = 0; b < 10; b++) {
      const bw = 0.05 + Math.random() * 0.08, bh = 0.5 + Math.random() * 0.4;
      if (cursor > 2.3) break;
      const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.25), new THREE.MeshStandardMaterial({ color: bookColors[b % 7], roughness: 0.65 }));
      book.position.set(cursor, y + bh / 2 + 0.025, -3.4);
      book.rotation.z = (Math.random() - 0.5) * 0.03; g.add(book);
      cursor += bw + 0.01;
    }
  }
  // Desk lamp glow
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe8a0, emissive: 0xffa020, emissiveIntensity: 1, roughness: 0.3 }));
  lamp.position.set(1.5, -0.8, -2); g.add(lamp);
  return g;
}

function buildArcticEnv(): THREE.Group {
  const g = new THREE.Group();
  // Snow ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshStandardMaterial({ color: 0xd4f5ff, roughness: 0.6, metalness: 0.05 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.8; ground.receiveShadow = true; g.add(ground);
  // Ice crystals
  const iceGeo = new THREE.ConeGeometry(0.15, 0.8, 5);
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xa5f3fc, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.75 });
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 4;
    const ice = new THREE.Mesh(iceGeo, iceMat);
    ice.position.set(Math.cos(a) * r, -1.4 + Math.random() * 0.3, Math.sin(a) * r);
    ice.scale.set(0.6 + Math.random() * 1, 0.8 + Math.random() * 1.5, 0.6 + Math.random() * 1);
    ice.rotation.set(Math.random() * 0.2, 0, (Math.random() - 0.5) * 0.3); ice.castShadow = true; g.add(ice);
  }
  // Snow mounds
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe8f8ff, roughness: 0.7 }));
    const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 3;
    m.position.set(Math.cos(a) * r, -1.9, Math.sin(a) * r); m.scale.y = 0.4; g.add(m);
  }
  // Aurora shimmer (flat ring)
  const auroraGeo = new THREE.TorusGeometry(3, 0.3, 4, 32);
  const auroraMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.5, transparent: true, opacity: 0.3, roughness: 0.2, side: THREE.DoubleSide });
  const aurora = new THREE.Mesh(auroraGeo, auroraMat);
  aurora.position.set(0, 3, -2); aurora.rotation.x = Math.PI / 3; g.add(aurora);
  return g;
}

function buildSakuraEnv(): THREE.Group {
  const g = new THREE.Group();
  // Grass ground
  const ground = new THREE.Mesh(new THREE.CircleGeometry(8, 32), new THREE.MeshStandardMaterial({ color: 0x7cb860, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -1.8; ground.receiveShadow = true; g.add(ground);
  // Cherry blossom trees
  const tGeo = new THREE.CylinderGeometry(0.05, 0.08, 1.2, 6);
  const bGeo = new THREE.SphereGeometry(0.6, 10, 8);
  const pinks = [0xf9a8d4, 0xfbcfe8, 0xf472b6, 0xec4899];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.3, r = 2.5 + Math.random() * 3.5;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const trunk = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 1 }));
    trunk.position.set(x, -1.2, z); g.add(trunk);
    const bloom = new THREE.Mesh(bGeo, new THREE.MeshStandardMaterial({ color: pinks[i % 4], roughness: 0.6, transparent: true, opacity: 0.85 }));
    bloom.position.set(x, -0.3 + Math.random() * 0.3, z);
    bloom.scale.set(0.7 + Math.random() * 0.5, 0.5 + Math.random() * 0.3, 0.7 + Math.random() * 0.5); bloom.castShadow = true; g.add(bloom);
  }
  // Fallen petals on ground
  const petalGeo = new THREE.CircleGeometry(0.03, 5);
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 50; i++) {
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.position.set((Math.random() - 0.5) * 6, -1.78, (Math.random() - 0.5) * 6);
    p.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3; p.rotation.z = Math.random() * Math.PI; g.add(p);
  }
  // Lantern
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffaa40, emissiveIntensity: 1, roughness: 0.3 }));
  lantern.position.set(1, -0.5, -1.5); g.add(lantern);
  return g;
}
