import * as THREE from 'three';
import type { WorldView } from '../world-provider';

export interface GreenWorldController {
  setView(view: WorldView): void;
  setTheme(themeKey: string | null): void;
  resize(): void;
  dispose(): void;
}

interface ViewPose { pos: THREE.Vector3; look: THREE.Vector3; }

// Default (library) camera angles
const LIBRARY_VIEWS: Record<WorldView, ViewPose> = {
  login:   { pos: new THREE.Vector3(0, 2.8, 6.5), look: new THREE.Vector3(0, 2.0, 0) },
  library: { pos: new THREE.Vector3(0, 2.5, 5.5), look: new THREE.Vector3(0, 2.0, -2) },
  reader:  { pos: new THREE.Vector3(0, 2.2, 4.0), look: new THREE.Vector3(0, 1.8, -2) },
  writer:  { pos: new THREE.Vector3(0, 2.4, 4.5), look: new THREE.Vector3(0, 1.9, -1) },
};

// Bird's-eye for outdoor/non-library themes
const OUTDOOR_VIEWS: Record<WorldView, ViewPose> = {
  login:   { pos: new THREE.Vector3(0, 8, 6),   look: new THREE.Vector3(0, 0, -1) },
  library: { pos: new THREE.Vector3(0, 9, 5),   look: new THREE.Vector3(0, 0, -2) },
  reader:  { pos: new THREE.Vector3(0, 7, 4),   look: new THREE.Vector3(0, 0, -1) },
  writer:  { pos: new THREE.Vector3(0, 8, 4.5), look: new THREE.Vector3(0, 0, -1) },
};

type EnvKey = 'library' | 'forest' | 'ocean' | 'sunset' | 'night-sky' | 'cozy-cabin' | 'arctic' | 'sakura';

export function createGreenWorld(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean },
): GreenWorldController {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 150);

  // ── Shared lights (re-configured per env) ──
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  scene.add(sun);
  const fill = new THREE.PointLight(0xffffff, 0.6, 20, 2);
  fill.position.set(-4, 4, 3);
  scene.add(fill);

  // ── Environment groups ──
  const envGroups: Map<EnvKey, THREE.Group> = new Map();
  let activeEnv: EnvKey = 'library';

  // Pre-build all environments
  const libraryGroup = buildLibrary(scene);
  envGroups.set('library', libraryGroup);
  scene.add(libraryGroup);

  const forestGroup = buildForest();
  forestGroup.visible = false;
  envGroups.set('forest', forestGroup);
  scene.add(forestGroup);

  const oceanGroup = buildOcean();
  oceanGroup.visible = false;
  envGroups.set('ocean', oceanGroup);
  scene.add(oceanGroup);

  const sunsetGroup = buildSunset();
  sunsetGroup.visible = false;
  envGroups.set('sunset', sunsetGroup);
  scene.add(sunsetGroup);

  const nightGroup = buildNight();
  nightGroup.visible = false;
  envGroups.set('night-sky', nightGroup);
  scene.add(nightGroup);

  const cabinGroup = buildCabin();
  cabinGroup.visible = false;
  envGroups.set('cozy-cabin', cabinGroup);
  scene.add(cabinGroup);

  const arcticGroup = buildArctic();
  arcticGroup.visible = false;
  envGroups.set('arctic', arcticGroup);
  scene.add(arcticGroup);

  const sakuraGroup = buildSakura();
  sakuraGroup.visible = false;
  envGroups.set('sakura', sakuraGroup);
  scene.add(sakuraGroup);

  // ── Particles (dust/pollen — shared, color changes) ──
  const PARTICLE_COUNT = 300;
  const particleGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(PARTICLE_COUNT * 3);
  const pSeeds = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 20;
    pPositions[i * 3 + 1] = Math.random() * 8;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    pSeeds[i] = Math.random() * Math.PI * 2;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const particleMat = new THREE.PointsMaterial({ color: 0xffeedd, size: 0.04, transparent: true, opacity: 0.5, depthWrite: false, sizeAttenuation: true });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Apply default library state
  applyEnv('library');

  // ── Animation ──
  let currentView: WorldView = 'login';
  let views = LIBRARY_VIEWS;
  let target = views.login;
  const curPos = target.pos.clone();
  const curLook = target.look.clone();
  const { reducedMotion } = opts;
  const clock = new THREE.Clock();
  let raf = 0;

  function applyEnv(key: EnvKey) {
    // Hide all, show target
    envGroups.forEach((g, k) => { g.visible = k === key; });
    activeEnv = key;

    // Set camera mode
    views = key === 'library' || key === 'cozy-cabin' ? LIBRARY_VIEWS : OUTDOOR_VIEWS;
    target = views[currentView];

    // Configure lighting + background per environment
    const cfg = ENV_CONFIGS[key];
    scene.background = new THREE.Color(cfg.bg);
    scene.fog = new THREE.FogExp2(new THREE.Color(cfg.fog).getHex(), cfg.fogDensity);
    ambient.color.set(cfg.ambient);
    ambient.intensity = cfg.ambientIntensity;
    hemi.color.set(cfg.hemiTop);
    hemi.groundColor.set(cfg.hemiBottom);
    hemi.intensity = cfg.hemiIntensity;
    sun.color.set(cfg.sunColor);
    sun.intensity = cfg.sunIntensity;
    sun.position.copy(cfg.sunPos);
    fill.color.set(cfg.fillColor);
    fill.intensity = cfg.fillIntensity;
    particleMat.color.set(cfg.particleColor);
    particleMat.opacity = cfg.particleOpacity;
  }

  const tick = () => {
    const dt = Math.min(clock.getDelta(), 1 / 20);
    const t = clock.elapsedTime;
    const ease = 1 - Math.exp(-2.0 * dt);

    curPos.lerp(target.pos, ease);
    curLook.lerp(target.look, ease);
    camera.position.copy(curPos);

    if (!reducedMotion) {
      // Smooth cinematic camera sway
      camera.position.x += Math.sin(t * 0.08) * 0.06;
      camera.position.y += Math.cos(t * 0.06) * 0.03;
      camera.position.z += Math.sin(t * 0.04) * 0.02;

      // Particles: smooth drift with gentle swirl
      const arr = particleGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let y = arr.getY(i) + dt * (0.06 + 0.04 * Math.sin(pSeeds[i] + t * 0.15));
        let x = arr.getX(i) + Math.sin(t * 0.1 + pSeeds[i]) * dt * 0.05;
        let z = arr.getZ(i) + Math.cos(t * 0.12 + pSeeds[i] * 2) * dt * 0.02;
        if (y > 10) { y = -0.5; x = (Math.random() - 0.5) * 20; z = (Math.random() - 0.5) * 20; }
        arr.setX(i, x);
        arr.setY(i, y);
        arr.setZ(i, z);
      }
      arr.needsUpdate = true;

      // Animate environment objects (subtle breathing/sway)
      const activeGroup = envGroups.get(activeEnv);
      if (activeGroup) {
        activeGroup.children.forEach((child, i) => {
          if (child instanceof THREE.Mesh && child.position.y > 0) {
            // Gentle vertical bob for elevated objects (trees, corals, crystals)
            child.position.y += Math.sin(t * 0.5 + i * 0.7) * dt * 0.008;
          }
        });
      }

      // Particle opacity pulsing (firefly effect)
      particleMat.opacity = (ENV_CONFIGS[activeEnv]?.particleOpacity ?? 0.4) + Math.sin(t * 0.8) * 0.08;
    }

    camera.lookAt(curLook);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h || 1;
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(tick);

  return {
    setView(view) {
      currentView = view;
      target = views[view] ?? views.login;
    },
    setTheme(themeKey) {
      if (!themeKey || !ENV_CONFIGS[themeKey as EnvKey]) {
        applyEnv('library');
      } else {
        applyEnv(themeKey as EnvKey);
      }
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    },
  };
}

/* ═══════════════════════════════════════════════════════════════
   ENVIRONMENT CONFIGS
   ═══════════════════════════════════════════════════════════════ */

interface EnvConfig {
  bg: string; fog: string; fogDensity: number;
  ambient: string; ambientIntensity: number;
  hemiTop: string; hemiBottom: string; hemiIntensity: number;
  sunColor: string; sunIntensity: number; sunPos: THREE.Vector3;
  fillColor: string; fillIntensity: number;
  particleColor: string; particleOpacity: number;
}

const ENV_CONFIGS: Record<EnvKey, EnvConfig> = {
  library: {
    bg: '#2a1a0d', fog: '#2a1a0d', fogDensity: 0.045,
    ambient: '#5c3a1e', ambientIntensity: 0.6,
    hemiTop: '#ffecc8', hemiBottom: '#2a1508', hemiIntensity: 0.5,
    sunColor: '#ffe8c0', sunIntensity: 2.0, sunPos: new THREE.Vector3(3, 6, 5),
    fillColor: '#ffc880', fillIntensity: 1.0,
    particleColor: '#ffeedd', particleOpacity: 0.4,
  },
  forest: {
    bg: '#0a2210', fog: '#0a2210', fogDensity: 0.03,
    ambient: '#1a4d2e', ambientIntensity: 0.7,
    hemiTop: '#88eea0', hemiBottom: '#052e16', hemiIntensity: 0.6,
    sunColor: '#fde68a', sunIntensity: 1.5, sunPos: new THREE.Vector3(5, 10, 4),
    fillColor: '#4ade80', fillIntensity: 0.5,
    particleColor: '#ccffdd', particleOpacity: 0.5,
  },
  ocean: {
    bg: '#041828', fog: '#041828', fogDensity: 0.035,
    ambient: '#0e4456', ambientIntensity: 0.6,
    hemiTop: '#67e8f9', hemiBottom: '#0c1e2e', hemiIntensity: 0.5,
    sunColor: '#a5f3fc', sunIntensity: 1.2, sunPos: new THREE.Vector3(2, 12, 3),
    fillColor: '#22d3ee', fillIntensity: 0.6,
    particleColor: '#a5f3fc', particleOpacity: 0.4,
  },
  sunset: {
    bg: '#1e1b4b', fog: '#3b0764', fogDensity: 0.02,
    ambient: '#7c2d12', ambientIntensity: 0.7,
    hemiTop: '#fbbf24', hemiBottom: '#4c1d95', hemiIntensity: 0.6,
    sunColor: '#fde68a', sunIntensity: 2.0, sunPos: new THREE.Vector3(-3, 2, 8),
    fillColor: '#f97316', fillIntensity: 0.8,
    particleColor: '#fde68a', particleOpacity: 0.5,
  },
  'night-sky': {
    bg: '#030014', fog: '#0f0a2a', fogDensity: 0.015,
    ambient: '#1e1b4b', ambientIntensity: 0.4,
    hemiTop: '#6366f1', hemiBottom: '#030014', hemiIntensity: 0.3,
    sunColor: '#c4b5fd', sunIntensity: 0.8, sunPos: new THREE.Vector3(0, 10, 0),
    fillColor: '#818cf8', fillIntensity: 0.4,
    particleColor: '#e0e7ff', particleOpacity: 0.7,
  },
  'cozy-cabin': {
    bg: '#1c0f00', fog: '#1c0f00', fogDensity: 0.05,
    ambient: '#451a03', ambientIntensity: 0.6,
    hemiTop: '#fbbf24', hemiBottom: '#1c0f00', hemiIntensity: 0.5,
    sunColor: '#fde68a', sunIntensity: 1.8, sunPos: new THREE.Vector3(2, 5, 3),
    fillColor: '#f59e0b', fillIntensity: 1.2,
    particleColor: '#fef3c7', particleOpacity: 0.5,
  },
  arctic: {
    bg: '#041520', fog: '#083344', fogDensity: 0.025,
    ambient: '#0e7490', ambientIntensity: 0.6,
    hemiTop: '#ecfeff', hemiBottom: '#041520', hemiIntensity: 0.5,
    sunColor: '#a5f3fc', sunIntensity: 1.4, sunPos: new THREE.Vector3(4, 8, 6),
    fillColor: '#06b6d4', fillIntensity: 0.5,
    particleColor: '#ffffff', particleOpacity: 0.6,
  },
  sakura: {
    bg: '#1a0410', fog: '#500724', fogDensity: 0.03,
    ambient: '#831843', ambientIntensity: 0.6,
    hemiTop: '#fbcfe8', hemiBottom: '#500724', hemiIntensity: 0.5,
    sunColor: '#fbcfe8', sunIntensity: 1.5, sunPos: new THREE.Vector3(3, 8, 4),
    fillColor: '#f472b6', fillIntensity: 0.7,
    particleColor: '#fce7f3', particleOpacity: 0.6,
  },
};

/* ═══════════════════════════════════════════════════════════════
   ENVIRONMENT BUILDERS — each returns a self-contained Group
   ═══════════════════════════════════════════════════════════════ */

const BOOK_COLORS = [0x8B0000, 0x006400, 0x00008B, 0x8B4513, 0x4B0082, 0x2F4F4F, 0x800000, 0xDAA520, 0x191970, 0x556B2F];

function makeScatteredBooks(group: THREE.Group, groundY: number, count: number, spread: number) {
  const geo = new THREE.BoxGeometry(0.3, 0.05, 0.4);
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: BOOK_COLORS[i % BOOK_COLORS.length], roughness: 0.6, metalness: 0.05 });
    const book = new THREE.Mesh(geo, mat);
    const angle = Math.random() * Math.PI * 2;
    const r = 1 + Math.random() * spread;
    book.position.set(Math.cos(angle) * r, groundY + 0.025 + Math.random() * 0.05 * i, Math.sin(angle) * r - 2);
    book.rotation.y = Math.random() * Math.PI;
    book.rotation.z = (Math.random() - 0.5) * 0.1;
    book.castShadow = true;
    book.receiveShadow = true;
    group.add(book);
  }
}

// ─── LIBRARY ───
function buildLibrary(scene: THREE.Scene): THREE.Group {
  const g = new THREE.Group();
  const ROOM_W = 16, ROOM_H = 7, ROOM_D = 14;

  const woodFloor = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0d, roughness: 0.95 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x1f1208, roughness: 1 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.7, metalness: 0.08 });

  // Floor, ceiling, walls
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), woodFloor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), ceilingMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM_H; g.add(ceil);

  const bw = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  bw.position.set(0, ROOM_H / 2, -ROOM_D / 2); g.add(bw);
  const lw = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  lw.rotation.y = Math.PI / 2; lw.position.set(-ROOM_W / 2, ROOM_H / 2, 0); g.add(lw);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  rw.rotation.y = -Math.PI / 2; rw.position.set(ROOM_W / 2, ROOM_H / 2, 0); g.add(rw);

  // Shelves + books on back wall
  const shelfGeo = new THREE.BoxGeometry(2.4, 0.06, 0.45);
  for (let col = 0; col < 5; col++) {
    const x = -4.8 + col * 2.4;
    for (let row = 0; row < 4; row++) {
      const y = 1.2 + row * 1.5;
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(x, y, -ROOM_D / 2 + 0.3);
      shelf.castShadow = true; shelf.receiveShadow = true;
      g.add(shelf);
      // Books on shelf
      let cursor = x - 1.1;
      const bCount = 6 + Math.floor(Math.random() * 5);
      for (let b = 0; b < bCount; b++) {
        const bw2 = 0.06 + Math.random() * 0.1;
        const bh = 0.7 + Math.random() * 0.5;
        const bd = 0.28 + Math.random() * 0.08;
        if (cursor + bw2 > x + 1.1) break;
        const bGeo = new THREE.BoxGeometry(bw2, bh, bd);
        const bMat = new THREE.MeshStandardMaterial({ color: BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)], roughness: 0.7 + Math.random() * 0.2 });
        const bMesh = new THREE.Mesh(bGeo, bMat);
        bMesh.position.set(cursor + bw2 / 2, y + bh / 2 + 0.03, -ROOM_D / 2 + 0.5);
        bMesh.rotation.z = (Math.random() - 0.5) * 0.04;
        bMesh.castShadow = true;
        g.add(bMesh);
        cursor += bw2 + 0.01;
      }
    }
  }

  // Desk + lamp
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 1.2), new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.75 }));
  desk.position.set(0, 1.0, 1.5); desk.castShadow = true; desk.receiveShadow = true; g.add(desk);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffe8a0, emissive: 0xffa020, emissiveIntensity: 0.5, roughness: 0.3 }));
  globe.position.set(0.8, 1.25, 1.5); g.add(globe);

  return g;
}

// ─── FOREST ───
function buildForest(): THREE.Group {
  const g = new THREE.Group();
  // Grass ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x2d8a22, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);

  // Trees
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 2, 8);
  const foliageGeo = new THREE.SphereGeometry(1.2, 8, 6);
  const greens = [0x2d8a22, 0x3fa834, 0x57bf45, 0x1a6b15];
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 14;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r - 3;
    const s = 0.7 + Math.random() * 1.2;
    const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5c3d20, roughness: 1 }));
    trunk.position.set(x, s, z); trunk.scale.setScalar(s); trunk.castShadow = true; g.add(trunk);
    const fol = new THREE.Mesh(foliageGeo, new THREE.MeshStandardMaterial({ color: greens[i % greens.length], roughness: 0.85 }));
    fol.position.set(x, s * 2.5, z); fol.scale.set(s, s * 0.8, s); fol.castShadow = true; g.add(fol);
  }
  makeScatteredBooks(g, 0, 8, 4);
  return g;
}

// ─── OCEAN ───
function buildOcean(): THREE.Group {
  const g = new THREE.Group();
  // Sandy ocean floor
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40, 32, 32), new THREE.MeshStandardMaterial({ color: 0x1a6b8a, roughness: 0.8, metalness: 0.1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  // Add gentle waves to the floor
  const gp = ground.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), y = gp.getY(i);
    gp.setZ(i, Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.3);
  }
  ground.geometry.computeVertexNormals();
  g.add(ground);

  // Coral/rocks
  const coralGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const coralColors = [0xff6b6b, 0xff9f43, 0x48dbfb, 0x0abde3, 0x10ac84];
  for (let i = 0; i < 15; i++) {
    const coral = new THREE.Mesh(coralGeo, new THREE.MeshStandardMaterial({ color: coralColors[i % coralColors.length], roughness: 0.7 }));
    const angle = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 10;
    coral.position.set(Math.cos(angle) * r, Math.random() * 0.4, Math.sin(angle) * r - 2);
    coral.scale.set(0.4 + Math.random() * 0.8, 0.5 + Math.random() * 1, 0.4 + Math.random() * 0.8);
    coral.castShadow = true; g.add(coral);
  }
  makeScatteredBooks(g, 0.1, 6, 3);
  return g;
}

// ─── SUNSET ───
function buildSunset(): THREE.Group {
  const g = new THREE.Group();
  // Desert ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: 0xc2956b, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);

  // Dunes (large rounded shapes)
  const duneGeo = new THREE.SphereGeometry(3, 12, 8);
  for (let i = 0; i < 8; i++) {
    const dune = new THREE.Mesh(duneGeo, new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.95 }));
    const angle = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 12;
    dune.position.set(Math.cos(angle) * r, -1.5, Math.sin(angle) * r - 4);
    dune.scale.set(1 + Math.random(), 0.3 + Math.random() * 0.3, 1 + Math.random());
    g.add(dune);
  }
  makeScatteredBooks(g, 0, 7, 4);
  return g;
}

// ─── NIGHT SKY ───
function buildNight(): THREE.Group {
  const g = new THREE.Group();
  // Dark ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0a0520, roughness: 0.9, metalness: 0.1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);

  // Stars (small spheres scattered high)
  const starGeo = new THREE.SphereGeometry(0.03, 4, 4);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 100; i++) {
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set((Math.random() - 0.5) * 30, 5 + Math.random() * 15, (Math.random() - 0.5) * 30);
    g.add(star);
  }

  // Glowing nebula pillars
  const pillarGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
  const pillarColors = [0x6366f1, 0x8b5cf6, 0xa78bfa, 0x4f46e5];
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(pillarGeo, new THREE.MeshStandardMaterial({ color: pillarColors[i % pillarColors.length], emissive: pillarColors[i % pillarColors.length], emissiveIntensity: 0.3, roughness: 0.5 }));
    const angle = Math.random() * Math.PI * 2;
    const r = 7 + Math.random() * 8;
    p.position.set(Math.cos(angle) * r, 2, Math.sin(angle) * r - 3);
    p.castShadow = true; g.add(p);
  }
  makeScatteredBooks(g, 0, 6, 3.5);
  return g;
}

// ─── COZY CABIN ───
function buildCabin(): THREE.Group {
  const g = new THREE.Group();
  const ROOM_W = 10, ROOM_H = 5, ROOM_D = 10;

  const woodFloor = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d2211, roughness: 0.9 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), woodFloor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), wallMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = ROOM_H; g.add(ceil);
  const bw2 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  bw2.position.set(0, ROOM_H / 2, -ROOM_D / 2); g.add(bw2);
  const lw2 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  lw2.rotation.y = Math.PI / 2; lw2.position.set(-ROOM_W / 2, ROOM_H / 2, 0); g.add(lw2);
  const rw2 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  rw2.rotation.y = -Math.PI / 2; rw2.position.set(ROOM_W / 2, ROOM_H / 2, 0); g.add(rw2);

  // Fireplace (back wall — glowing emissive)
  const fpGeo = new THREE.BoxGeometry(2, 2.5, 0.5);
  const fpMat = new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: 0.9 });
  const fp = new THREE.Mesh(fpGeo, fpMat); fp.position.set(0, 1.25, -ROOM_D / 2 + 0.3); g.add(fp);
  const fireGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const fireMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.5, roughness: 0.3 });
  const fire = new THREE.Mesh(fireGeo, fireMat); fire.position.set(0, 0.6, -ROOM_D / 2 + 0.5); g.add(fire);

  // Rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2, 24), new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2; rug.position.y = 0.01; g.add(rug);

  makeScatteredBooks(g, 0.01, 5, 2);
  return g;
}

// ─── ARCTIC ───
function buildArctic(): THREE.Group {
  const g = new THREE.Group();
  // Snow ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshStandardMaterial({ color: 0xd4f5ff, roughness: 0.7, metalness: 0.05 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);

  // Ice formations
  const iceGeo = new THREE.ConeGeometry(0.6, 2.5, 6);
  const iceMat = new THREE.MeshStandardMaterial({ color: 0xa5f3fc, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 12; i++) {
    const ice = new THREE.Mesh(iceGeo, iceMat);
    const angle = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * 12;
    ice.position.set(Math.cos(angle) * r, 1.2, Math.sin(angle) * r - 3);
    ice.scale.set(0.5 + Math.random() * 0.8, 0.7 + Math.random() * 1.2, 0.5 + Math.random() * 0.8);
    ice.castShadow = true; g.add(ice);
  }

  // Snow mounds
  const moundGeo = new THREE.SphereGeometry(1.5, 10, 8);
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(moundGeo, new THREE.MeshStandardMaterial({ color: 0xe0f7ff, roughness: 0.8 }));
    const angle = Math.random() * Math.PI * 2;
    const r = 6 + Math.random() * 10;
    m.position.set(Math.cos(angle) * r, -0.5, Math.sin(angle) * r - 4);
    m.scale.set(1 + Math.random(), 0.4, 1 + Math.random()); g.add(m);
  }
  makeScatteredBooks(g, 0.05, 6, 4);
  return g;
}

// ─── SAKURA ───
function buildSakura(): THREE.Group {
  const g = new THREE.Group();
  // Petal-covered ground (pink-tinted grass)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x90be6d, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);

  // Cherry blossom trees
  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 2.5, 8);
  const blossomGeo = new THREE.SphereGeometry(1.5, 10, 8);
  const pinkShades = [0xf9a8d4, 0xfbcfe8, 0xf472b6, 0xec4899];
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 5 + Math.random() * 12;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r - 3;
    const trunk = new THREE.Mesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 1 }));
    trunk.position.set(x, 1.25, z); trunk.castShadow = true; g.add(trunk);
    const bloom = new THREE.Mesh(blossomGeo, new THREE.MeshStandardMaterial({ color: pinkShades[i % pinkShades.length], roughness: 0.7, transparent: true, opacity: 0.85 }));
    bloom.position.set(x, 3, z); bloom.scale.set(0.8 + Math.random() * 0.6, 0.6 + Math.random() * 0.4, 0.8 + Math.random() * 0.6);
    bloom.castShadow = true; g.add(bloom);
  }

  // Fallen petals on ground (flat discs)
  const petalGeo = new THREE.CircleGeometry(0.05, 6);
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.9, side: THREE.DoubleSide });
  for (let i = 0; i < 80; i++) {
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set((Math.random() - 0.5) * 14, 0.01, (Math.random() - 0.5) * 14 - 2);
    petal.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    petal.rotation.z = Math.random() * Math.PI; g.add(petal);
  }
  makeScatteredBooks(g, 0, 7, 4);
  return g;
}
