import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

interface Typewriter3DProps {
  onTextChange?: (text: string) => void;
  initialText?: string;
}

const ROW1 = ['Q','W','E','R','T','Y','U','I','O','P'];
const ROW2 = ['A','S','D','F','G','H','J','K','L',':'];
const ROW3 = ['!','Z','X','C','V','B','N','M',',','.','↵'];

export function Typewriter3D({ onTextChange, initialText = '' }: Typewriter3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<TypewriterCtrl | null>(null);
  const textRef = useRef(initialText);

  useEffect(() => {
    if (!canvasRef.current) return;
    ctrlRef.current = buildTypewriter(canvasRef.current, textRef.current);
    return () => { ctrlRef.current?.dispose(); ctrlRef.current = null; };
  }, []);

  // Keyboard input
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!ctrlRef.current) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let k = '';
    if (e.key === 'Enter') k = '\n';
    else if (e.key === 'Backspace') k = 'BS';
    else if (e.key === ' ') k = ' ';
    else if (e.key.length === 1) k = e.key;
    else return;
    e.preventDefault();
    applyKey(k);
  }, [onTextChange]);

  function applyKey(k: string) {
    if (k === 'BS') textRef.current = textRef.current.slice(0, -1);
    else textRef.current += k;
    onTextChange?.(textRef.current);
    const label = k === '\n' ? '↵' : k === ' ' ? 'SPACE' : k.toUpperCase();
    ctrlRef.current!.press(label);
    ctrlRef.current!.renderPaper(textRef.current);
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Mouse click on keys (raycasting)
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!ctrlRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const hit = ctrlRef.current.raycastKey(x, y);
    if (hit) {
      let k: string;
      if (hit === '↵') k = '\n';
      else if (hit === 'SPACE') k = ' ';
      else k = hit.toLowerCase();
      applyKey(k);
    }
  }, [onTextChange]);

  // Scroll zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    ctrlRef.current?.zoom(-e.deltaY * 0.002);
  }, []);

  // Drag rotate
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    ctrlRef.current?.orbit(dx * 0.005, dy * 0.003);
  }, []);

  const onPointerUp = useCallback(() => { dragging.current = false; }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full outline-none cursor-default"
      tabIndex={0}
      onClick={handleClick}
      onWheel={handleWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   Three.js Typewriter Scene — polished, interactive
   ═══════════════════════════════════════════════════════════════ */

interface TypewriterCtrl {
  press(label: string): void;
  renderPaper(text: string): void;
  raycastKey(ndcX: number, ndcY: number): string | null;
  zoom(delta: number): void;
  orbit(dx: number, dy: number): void;
  dispose(): void;
}

function buildTypewriter(canvas: HTMLCanvasElement, initText: string): TypewriterCtrl {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc9a87c);

  // Camera (front-facing view, slightly above)
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  let camDist = 6.5;
  let camAngleX = 0.85; // polar: 0=top, PI/2=front
  let camAngleY = 0;    // azimuth: 0=front
  updateCamera();

  function updateCamera() {
    camera.position.set(
      Math.sin(camAngleY) * Math.sin(camAngleX) * camDist,
      Math.cos(camAngleX) * camDist,
      Math.cos(camAngleY) * Math.sin(camAngleX) * camDist
    );
    camera.lookAt(0, 0.8, 0);
  }

  // Lighting
  scene.add(new THREE.AmbientLight(0xfff5e6, 0.5));
  const keyL = new THREE.DirectionalLight(0xfff0d4, 1.6);
  keyL.position.set(4, 10, 6); keyL.castShadow = true;
  keyL.shadow.mapSize.set(1024, 1024);
  keyL.shadow.camera.near = 1; keyL.shadow.camera.far = 25;
  keyL.shadow.camera.left = -5; keyL.shadow.camera.right = 5;
  keyL.shadow.camera.top = 5; keyL.shadow.camera.bottom = -5;
  scene.add(keyL);
  scene.add(new THREE.DirectionalLight(0xd4e8ff, 0.35).translateX(-4).translateY(5));

  // Desk
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.4, 10),
    new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.75, metalness: 0.05 })
  );
  desk.position.y = -0.2; desk.receiveShadow = true; scene.add(desk);

  // Materials
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x7ecfb0, roughness: 0.35, metalness: 0.08 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.15 });
  const keyCapMat = new THREE.MeshStandardMaterial({ color: 0xf8f4ea, roughness: 0.4, metalness: 0.02 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.2, metalness: 0.6 });

  // Body — all rounded ExtrudeGeometry for smooth edges
  const base = new THREE.Mesh(roundedBoxGeo(4.2, 0.5, 2.8, 0.12), bodyMat);
  base.position.set(0, 0.25, 0.2); base.castShadow = true; scene.add(base);
  const bed = new THREE.Mesh(roundedBoxGeo(3.8, 0.25, 1.6, 0.08), bodyMat);
  bed.position.set(0, 0.55, 0.7); bed.castShadow = true; scene.add(bed);
  const backBody = new THREE.Mesh(roundedBoxGeo(3.6, 1.6, 1.0, 0.12), bodyMat);
  backBody.position.set(0, 1.05, -0.8); backBody.castShadow = true; scene.add(backBody);
  // Top arch (smooth cylinder)
  const topGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.8, 32, 1, false, 0, Math.PI);
  const topArch = new THREE.Mesh(topGeo, bodyMat);
  topArch.rotation.z = Math.PI / 2; topArch.position.set(0, 1.7, -0.9);
  topArch.castShadow = true; scene.add(topArch);

  // Platen roller (higher poly for smoothness)
  const platen = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 32), darkMat);
  platen.rotation.z = Math.PI / 2; platen.position.set(0, 1.25, -0.3); platen.castShadow = true; scene.add(platen);
  // Knobs (rounded)
  const knobGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.18, 16);
  [-2.2, 2.2].forEach(x => {
    const knob = new THREE.Mesh(knobGeo, darkMat);
    knob.rotation.z = Math.PI / 2; knob.position.set(x, 1.25, -0.3); scene.add(knob);
  });

  // Paper
  const paperCanvas = document.createElement('canvas');
  paperCanvas.width = 600; paperCanvas.height = 840;
  const paperTex = new THREE.CanvasTexture(paperCanvas);
  paperTex.colorSpace = THREE.SRGBColorSpace;
  const paperMat = new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.92, metalness: 0, side: THREE.DoubleSide });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.8), paperMat);
  paper.position.set(0, 3.0, -1.0); paper.rotation.x = -0.06; paper.castShadow = true; scene.add(paper);
  drawPaper(paperCanvas, paperTex, initText);

  // Carriage (the metal bar that moves left-right)
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 0.06), metalMat);
  carriage.position.set(0, 1.15, 0.0); scene.add(carriage);
  let carriageX = 0;

  // Keys — labels as children of key caps so they move together
  const keyGeo = new THREE.CylinderGeometry(0.14, 0.135, 0.13, 20);
  const keyMeshes = new Map<string, THREE.Mesh>();
  const keyRestY = new Map<string, number>();
  const keyGroup = new THREE.Group();
  scene.add(keyGroup);

  function makeKeyRow(row: string[], rowIdx: number, zPos: number, xOff: number) {
    const spacing = 0.35;
    const startX = -(row.length - 1) * spacing / 2 + xOff;
    row.forEach((label, i) => {
      const x = startX + i * spacing;
      const y = 0.72;
      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 8), metalMat);
      stem.position.set(x, y - 0.1, zPos); keyGroup.add(stem);
      // Cap (rounded cylinder)
      const cap = new THREE.Mesh(keyGeo, keyCapMat.clone());
      cap.position.set(x, y, zPos); cap.castShadow = true;
      cap.userData = { label };
      keyGroup.add(cap);
      keyMeshes.set(label, cap);
      keyRestY.set(label, y);
      // Label as CHILD of cap — moves with it
      const labelPlane = makeKeyLabelMesh(label);
      labelPlane.rotation.x = -Math.PI / 2;
      labelPlane.position.set(0, 0.07, 0); // local offset above cap center
      cap.add(labelPlane);
    });
  }

  makeKeyRow(ROW1, 0, 0.2, 0);
  makeKeyRow(ROW2, 1, 0.55, 0.07);
  makeKeyRow(ROW3, 2, 0.9, 0.03);

  // Space bar (rounded box)
  const spaceGeo = roundedBoxGeo(2.2, 0.1, 0.3, 0.04);
  const space = new THREE.Mesh(spaceGeo, keyCapMat.clone());
  space.position.set(0.05, 0.66, 1.3); space.castShadow = true;
  space.userData = { label: 'SPACE' };
  keyGroup.add(space);
  keyMeshes.set('SPACE', space);
  keyRestY.set('SPACE', 0.66);

  // Raycaster for mouse clicks (recursive to catch label planes on keys)
  const raycaster = new THREE.Raycaster();

  function findKeyLabel(obj: THREE.Object3D): string | null {
    if (obj.userData?.label) return obj.userData.label;
    if (obj.parent && obj.parent !== keyGroup) return findKeyLabel(obj.parent);
    return null;
  }

  // Audio
  let audioCtx: AudioContext | null = null;
  function clickSound() {
    if (!audioCtx) try { audioCtx = new AudioContext(); } catch { return; }
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const g1 = ctx.createGain();
    const g2 = ctx.createGain();
    const flt = ctx.createBiquadFilter();
    osc.connect(g1); g1.connect(flt); flt.connect(ctx.destination);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000 + Math.random() * 400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.03);
    g1.gain.setValueAtTime(0.12, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
    flt.type = 'lowpass'; flt.frequency.value = 2800;
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(160 + Math.random() * 50, ctx.currentTime);
    g2.gain.setValueAtTime(0.05, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
    osc2.start(); osc2.stop(ctx.currentTime + 0.1);
  }
  function bellSound() {
    if (!audioCtx) try { audioCtx = new AudioContext(); } catch { return; }
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.5);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(); osc.stop(ctx.currentTime + 0.55);
  }
  function carriageReturnSound() {
    if (!audioCtx) try { audioCtx = new AudioContext(); } catch { return; }
    const ctx = audioCtx;
    // Mechanical zip + ding
    const noise = ctx.createOscillator();
    const g = ctx.createGain();
    noise.connect(g); g.connect(ctx.destination);
    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(80, ctx.currentTime);
    noise.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    noise.start(); noise.stop(ctx.currentTime + 0.16);
    // Bell after
    setTimeout(() => bellSound(), 120);
  }

  // Animation
  const clock = new THREE.Clock();
  let raf = 0;
  const pressedKeys = new Map<string, number>();
  let carriageTarget = 0;
  let paperTargetY = 3.0;

  const tick = () => {
    const t = clock.elapsedTime;
    const dt = Math.min(clock.getDelta(), 1 / 20);

    // Key spring animation
    pressedKeys.forEach((startT, label) => {
      const mesh = keyMeshes.get(label);
      const restY = keyRestY.get(label) ?? 0.72;
      if (!mesh) return;
      const elapsed = t - startT;
      if (elapsed < 0.04) {
        mesh.position.y = restY - 0.08 * (elapsed / 0.04);
      } else if (elapsed < 0.22) {
        const p = (elapsed - 0.04) / 0.18;
        const spring = 1 + Math.sin(p * Math.PI * 3.5) * 0.2 * (1 - p);
        mesh.position.y = restY - 0.08 + 0.08 * p * spring;
      } else {
        mesh.position.y = restY;
        pressedKeys.delete(label);
      }
    });

    // Carriage smooth slide
    carriage.position.x += (carriageTarget - carriage.position.x) * 0.12;

    // Paper smooth scroll
    paper.position.y += (paperTargetY - paper.position.y) * 0.08;

    // Gentle camera micro-sway
    const baseX = Math.sin(camAngleY) * Math.sin(camAngleX) * camDist;
    const baseY = Math.cos(camAngleX) * camDist;
    const baseZ = Math.cos(camAngleY) * Math.sin(camAngleX) * camDist;
    camera.position.set(
      baseX + Math.sin(t * 0.08) * 0.04,
      baseY + Math.cos(t * 0.06) * 0.02,
      baseZ
    );
    camera.lookAt(0, 0.8, 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  const resize = () => {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(tick);

  return {
    press(label: string) {
      pressedKeys.set(label, clock.elapsedTime);
      if (label === '↵') {
        // Carriage return: reset carriage position, scroll paper
        carriageTarget = 0;
        carriageReturnSound();
      } else {
        // Move carriage slightly right with each character
        carriageTarget = Math.min(carriageTarget + 0.08, 1.5);
        clickSound();
      }
    },

    renderPaper(text: string) {
      drawPaper(paperCanvas, paperTex, text);
      const lines = text.split('\n').length;
      paperTargetY = 3.0 + Math.max(0, (lines - 6) * 0.08);
      // Reset carriage on newline
      if (text.endsWith('\n')) carriageTarget = 0;
    },

    raycastKey(ndcX: number, ndcY: number): string | null {
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      const hits = raycaster.intersectObjects(keyGroup.children, true);
      for (const hit of hits) {
        const label = findKeyLabel(hit.object);
        if (label) return label;
      }
      return null;
    },

    zoom(delta: number) {
      camDist = Math.max(2.5, Math.min(25, camDist + delta * -4));
      updateCamera();
    },

    orbit(dx: number, dy: number) {
      camAngleY += dx;
      camAngleX = Math.max(0.3, Math.min(1.4, camAngleX - dy));
      updateCamera();
    },

    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      if (audioCtx) audioCtx.close();
    },
  };
}

/* ─── Paper rendering ─── */
function drawPaper(c: HTMLCanvasElement, tex: THREE.CanvasTexture, text: string) {
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#faf8f2';
  ctx.fillRect(0, 0, 600, 840);
  // Grain
  ctx.globalAlpha = 0.025;
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#000' : '#8B7355';
    ctx.fillRect(Math.random() * 600, Math.random() * 840, 1, 1);
  }
  ctx.globalAlpha = 1;

  // Text with per-character jitter (typewriter feel)
  ctx.fillStyle = '#1a1a1a';
  ctx.font = '600 15px "Courier New", Courier, monospace';
  ctx.textBaseline = 'top';

  const lines = text.split('\n');
  const maxVisible = 34;
  const start = Math.max(0, lines.length - maxVisible);
  const visible = lines.slice(start);

  visible.forEach((line, i) => {
    let x = 50;
    for (const ch of line) {
      const jx = (Math.random() - 0.5) * 0.7;
      const jy = (Math.random() - 0.5) * 0.5;
      // Vary ink density slightly
      ctx.globalAlpha = 0.85 + Math.random() * 0.15;
      ctx.fillText(ch, x + jx, 55 + i * 21 + jy);
      x += ctx.measureText(ch).width;
    }
  });
  ctx.globalAlpha = 1;

  // Blinking cursor
  const lastLine = visible[visible.length - 1] || '';
  const curX = 50 + ctx.measureText(lastLine).width;
  const curY = 55 + (visible.length - 1) * 21;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(curX, curY, 1.5, 14);

  tex.needsUpdate = true;
}

/* ─── Key label — returns a mesh to add as child of key cap ─── */
function makeKeyLabelMesh(label: string): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3a3a3a';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label.length > 1 ? '⏎' : label, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), mat);
}

/* ─── Rounded box geometry (ExtrudeGeometry with bevel) ─── */
function roundedBoxGeo(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  const hw = w / 2 - r, hd = d / 2 - r;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.absarc(hw, -hd + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(hw + r, hd);
  shape.absarc(hw, hd, r, 0, Math.PI / 2, false);
  shape.lineTo(-hw, hd + r);
  shape.absarc(-hw, hd, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw - r, -hd + r);
  shape.absarc(-hw, -hd + r, r, Math.PI, Math.PI * 1.5, false);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: r * 0.4,
    bevelSize: r * 0.4,
    bevelSegments: 4,
  });
  geo.center();
  geo.rotateX(Math.PI / 2);
  return geo;
}
