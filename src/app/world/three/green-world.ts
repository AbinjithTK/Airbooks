import * as THREE from 'three';
import type { WorldView } from '../world-provider';

export interface GreenWorldController {
  setView(view: WorldView): void;
  resize(): void;
  dispose(): void;
}

interface ViewPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

const VIEWS: Record<WorldView, ViewPose> = {
  login: { pos: new THREE.Vector3(0, 3.4, 13), look: new THREE.Vector3(0, 2.6, 0) },
  library: { pos: new THREE.Vector3(0, 3.1, 11), look: new THREE.Vector3(0, 2.1, 0) },
  reader: { pos: new THREE.Vector3(0, 2.6, 8.5), look: new THREE.Vector3(0, 1.7, 0) },
  writer: { pos: new THREE.Vector3(0, 2.7, 9), look: new THREE.Vector3(0, 1.8, 0) },
};

/**
 * A calm, pleasant green meadow rendered with VANILLA three.js (no
 * react-three-fiber — its custom reconciler crashes in the Figma Make runtime).
 * Rolling hills, scattered low-poly trees and bushes, drifting pollen, soft sun
 * + sky light, and a gentle camera breathe. Designed as the persistent backdrop
 * behind the app's HTML overlay.
 */
export function createGreenWorld(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean },
): GreenWorldController {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = makeSkyGradient();
  scene.fog = new THREE.Fog(0xc7e9b0, 16, 60);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 220);
  camera.position.copy(VIEWS.login.pos);

  // ── Lighting ──
  const hemi = new THREE.HemisphereLight(0xeaffd0, 0x33502a, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d4, 1.6);
  sun.position.set(10, 18, 8);
  scene.add(sun);

  // Track everything disposable.
  const disposables: { dispose(): void }[] = [];
  const track = <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(o: T): T => {
    disposables.push(o);
    return o;
  };

  // ── Rolling ground ──
  const groundGeo = track(new THREE.PlaneGeometry(220, 220, 80, 80));
  const gp = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const y = gp.getY(i);
    const d = Math.sqrt(x * x + y * y);
    // Flat-ish near the centre (where the UI sits), gentle hills further out.
    const h =
      Math.sin(x * 0.07) * Math.cos(y * 0.06) * 1.6 +
      Math.sin(x * 0.18 + y * 0.12) * 0.5;
    gp.setZ(i, h * Math.min(1, d / 14));
  }
  groundGeo.computeVertexNormals();
  const groundMat = track(
    new THREE.MeshStandardMaterial({ color: 0x6cbf4a, roughness: 1, metalness: 0 }),
  );
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.3;
  scene.add(ground);

  // ── Trees (instanced trunks + foliage) ──
  const TREES = 70;
  const trunkGeo = track(new THREE.CylinderGeometry(0.14, 0.2, 1.4, 6));
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 }));
  const foliageGeo = track(new THREE.ConeGeometry(1.15, 2.4, 8));
  const foliageMat = track(new THREE.MeshStandardMaterial({ color: 0x4f9d3a, roughness: 1 }));

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREES);
  const foliage = new THREE.InstancedMesh(foliageGeo, foliageMat, TREES);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sVec = new THREE.Vector3();
  const pVec = new THREE.Vector3();
  const greenShades = [0x4f9d3a, 0x3f8a32, 0x62b04a, 0x57a23e, 0x6fbf52];
  const col = new THREE.Color();
  for (let i = 0; i < TREES; i++) {
    // Ring around the open centre so the meadow stays clear behind the UI.
    const angle = Math.random() * Math.PI * 2;
    const radius = 11 + Math.random() * 42;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.7 - 6; // push most trees back
    const scale = 0.8 + Math.random() * 1.6;
    const yaw = Math.random() * Math.PI * 2;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

    pVec.set(x, -1.3 + 0.7 * scale, z);
    sVec.set(scale, scale, scale);
    m.compose(pVec, q, sVec);
    trunks.setMatrixAt(i, m);

    pVec.set(x, -1.3 + 1.9 * scale, z);
    sVec.set(scale, scale * (0.9 + Math.random() * 0.4), scale);
    m.compose(pVec, q, sVec);
    foliage.setMatrixAt(i, m);
    col.setHex(greenShades[i % greenShades.length]);
    foliage.setColorAt(i, col);
  }
  trunks.instanceMatrix.needsUpdate = true;
  foliage.instanceMatrix.needsUpdate = true;
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  scene.add(trunks, foliage);

  // ── Bushes (instanced) near the meadow edges ──
  const BUSHES = 46;
  const bushGeo = track(new THREE.IcosahedronGeometry(0.7, 1));
  const bushMat = track(new THREE.MeshStandardMaterial({ color: 0x5aa83f, roughness: 1, flatShading: true }));
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, BUSHES);
  for (let i = 0; i < BUSHES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 7 + Math.random() * 30;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.7 - 4;
    const scale = 0.5 + Math.random() * 1.1;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI);
    pVec.set(x, -1.25 + 0.3 * scale, z);
    sVec.set(scale, scale * 0.8, scale);
    m.compose(pVec, q, sVec);
    bushes.setMatrixAt(i, m);
  }
  bushes.instanceMatrix.needsUpdate = true;
  scene.add(bushes);

  // ── Drifting pollen ──
  const POLLEN = 220;
  const pollenGeo = track(new THREE.BufferGeometry());
  const pollenPos = new Float32Array(POLLEN * 3);
  const pollenSeed = new Float32Array(POLLEN);
  for (let i = 0; i < POLLEN; i++) {
    pollenPos[i * 3] = (Math.random() - 0.5) * 40;
    pollenPos[i * 3 + 1] = Math.random() * 10;
    pollenPos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 4;
    pollenSeed[i] = Math.random() * Math.PI * 2;
  }
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
  const pollenMat = track(
    new THREE.PointsMaterial({
      color: 0xffffcc,
      size: 0.09,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    }),
  );
  const pollen = new THREE.Points(pollenGeo, pollenMat);
  scene.add(pollen);

  // ── Camera rig state ──
  let target = VIEWS.login;
  const curLook = VIEWS.login.look.clone();
  const { reducedMotion } = opts;

  const clock = new THREE.Clock();
  let raf = 0;

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    const t = clock.elapsedTime;
    const ease = 1 - Math.pow(0.0001, dt); // ~smooth lerp, framerate independent

    camera.position.lerp(target.pos, ease);
    curLook.lerp(target.look, ease);

    if (!reducedMotion) {
      camera.position.x += Math.sin(t * 0.18) * 0.05;
      camera.position.y += Math.cos(t * 0.15) * 0.03;
      // Breeze: sway foliage + bushes a hair.
      foliage.rotation.z = Math.sin(t * 0.6) * 0.012;
      bushes.rotation.z = Math.sin(t * 0.6 + 1) * 0.01;
      // Pollen drift upward and recycle.
      const arr = pollenGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < POLLEN; i++) {
        let y = arr.getY(i) + dt * (0.25 + 0.15 * Math.sin(pollenSeed[i]));
        let x = arr.getX(i) + Math.sin(t * 0.5 + pollenSeed[i]) * dt * 0.15;
        if (y > 11) y = 0;
        arr.setY(i, y);
        arr.setX(i, x);
      }
      arr.needsUpdate = true;
    }

    camera.lookAt(curLook);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
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
  raf = requestAnimationFrame(frame);

  return {
    setView(view) {
      target = VIEWS[view] ?? VIEWS.login;
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      scene.background = null;
      trunks.dispose();
      foliage.dispose();
      bushes.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}

/** Vertical sky gradient (soft blue → warm green horizon) as a CanvasTexture. */
function makeSkyGradient(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#bfe4ff');
  g.addColorStop(0.45, '#d8f0c4');
  g.addColorStop(1, '#a9d98a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
