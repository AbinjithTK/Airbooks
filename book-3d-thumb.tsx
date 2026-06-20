import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Book } from '../types';

interface Book3DThumbProps {
  book: Book;
  className?: string;
}

/**
 * Lightweight Three.js book thumbnail — renders the same polished 3D book model
 * (rounded ExtrudeGeometry, PBR materials, gold frame) used in the book creator,
 * but optimized for small card sizes. Gently rotates on idle.
 */
export function Book3DThumb({ book, className = '' }: Book3DThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctrlRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctrlRef.current = createBookThumb(canvas, book);
    return () => { ctrlRef.current?.dispose(); ctrlRef.current = null; };
  }, [book.coverColor, book.title, book.coverImage]);

  return <canvas ref={canvasRef} className={`block w-full h-full ${className}`} />;
}

function createBookThumb(canvas: HTMLCanvasElement, book: Book) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const w = canvas.clientWidth || 200;
  const h = canvas.clientHeight || 280;
  renderer.setSize(w, h, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 20);
  camera.position.set(0.8, 0.3, 3.8);
  camera.lookAt(0, 0, 0);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xfff8f0, 1.5);
  key.position.set(2, 4, 3);
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0xd0e8ff, 0.4).translateX(-2).translateY(2));

  // Book dimensions
  const W = 1.2, H = 1.7, D = 0.14, R = 0.035;

  // Materials
  const coverColor = new THREE.Color(book.coverColor);
  const coverMat = new THREE.MeshStandardMaterial({ color: coverColor, roughness: 0.5, metalness: 0.06 });
  const spineMat = new THREE.MeshStandardMaterial({ color: coverColor.clone().multiplyScalar(0.65), roughness: 0.55, metalness: 0.08 });
  const pageMat = new THREE.MeshStandardMaterial({ color: 0xFAF5E8, roughness: 0.92 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, roughness: 0.25, metalness: 0.85 });

  // Cover shape (rounded rect)
  const shape = roundedRect(W, H, R);
  const coverGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 3 });
  coverGeo.center();

  // Front cover
  const front = new THREE.Mesh(coverGeo, coverMat);
  front.position.z = D / 2;
  scene.add(front);

  // Back cover
  const back = new THREE.Mesh(coverGeo, coverMat.clone());
  back.position.z = -D / 2;
  back.rotation.y = Math.PI;
  scene.add(back);

  // Spine
  const spineShape = roundedRect(D, H, R * 0.4);
  const spineGeo = new THREE.ExtrudeGeometry(spineShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
  spineGeo.center();
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.rotation.y = Math.PI / 2;
  spine.position.x = -W / 2 - 0.005;
  scene.add(spine);

  // Pages block
  const pagesShape = roundedRect(W * 0.96, H * 0.95, R * 0.3);
  const pagesGeo = new THREE.ExtrudeGeometry(pagesShape, { depth: D * 0.82, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1 });
  pagesGeo.center();
  const pages = new THREE.Mesh(pagesGeo, pageMat);
  scene.add(pages);

  // Gold frame on front
  const frameOuter = roundedRect(W * 0.78, H * 0.78, R * 0.5);
  const frameInner = roundedRect(W * 0.78 - 0.02, H * 0.78 - 0.02, R * 0.4);
  frameOuter.holes.push(frameInner as unknown as THREE.Path);
  const frameGeo = new THREE.ExtrudeGeometry(frameOuter, { depth: 0.003, bevelEnabled: false });
  frameGeo.center();
  const frame = new THREE.Mesh(frameGeo, goldMat);
  frame.position.z = D / 2 + 0.019;
  scene.add(frame);

  // Title text (canvas texture on front)
  const textCanvas = document.createElement('canvas');
  textCanvas.width = 256; textCanvas.height = 360;
  const ctx = textCanvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 360);

  // Cover image
  if (book.coverImage) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, 256, 360); ctx.clip();
      const t = book.coverImageTransform || { x: 0, y: 0, scale: 1, rotation: 0 };
      ctx.translate(128, 180);
      ctx.translate(t.x * 1.28, t.y * 1.8);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.scale, t.scale);
      const aspect = img.width / img.height;
      const dh = 360, dw = dh * aspect;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
      textTex.needsUpdate = true;
    };
    img.src = book.coverImage;
  } else {
    // Title + author text
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 20px "DM Sans", sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, book.title, 25, 80, 200, 24);
    ctx.font = '14px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(book.author, 25, 160);
    ctx.font = '10px "DM Sans", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(book.category.toUpperCase(), 25, 330);
  }

  const textTex = new THREE.CanvasTexture(textCanvas);
  textTex.colorSpace = THREE.SRGBColorSpace;
  const textPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 0.82, H * 0.82),
    new THREE.MeshStandardMaterial({ map: textTex, transparent: true, roughness: 0.4, metalness: 0.3 })
  );
  textPlane.position.z = D / 2 + 0.02;
  scene.add(textPlane);

  // Animation
  const clock = new THREE.Clock();
  let raf = 0;
  const bookGroup = new THREE.Group();
  scene.children.forEach(c => { if (c !== key) bookGroup.add(c); });
  scene.add(bookGroup);

  const tick = () => {
    const t = clock.elapsedTime;
    // Gentle idle rotation
    bookGroup.rotation.y = -0.2 + Math.sin(t * 0.4) * 0.06;
    bookGroup.rotation.x = Math.sin(t * 0.3) * 0.02;
    bookGroup.position.y = Math.sin(t * 0.5) * 0.01;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      renderer.dispose();
      coverGeo.dispose(); spineGeo.dispose(); pagesGeo.dispose(); frameGeo.dispose();
      coverMat.dispose(); spineMat.dispose(); pageMat.dispose(); goldMat.dispose();
      textTex.dispose();
    }
  };
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(' ');
  let line = '', cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy); line = word; cy += lineH;
    } else { line = test; }
  }
  ctx.fillText(line, x, cy);
}
