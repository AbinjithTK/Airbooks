// Runtime capability checks for the 3D world layer. These let the app degrade
// gracefully on devices/browsers that can't (or shouldn't) run the full scene.

/**
 * True when the app is running inside an iframe. The Figma Make editor preview
 * iframes the app and injects its own React, which breaks react-three-fiber's
 * reconciler ("Cannot read properties of undefined"). We use this to skip the
 * WebGL canvas there entirely (→ CSS fallback) instead of letting it throw.
 * A cross-origin parent makes window.top access throw — that also means framed.
 */
export function inIframe(): boolean {
  try {
    return window.top !== window.self;
  } catch {
    return true;
  }
}

/** True when the browser can create a WebGL context. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

/** True when the user has requested reduced motion (OS-level accessibility). */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Device-pixel-ratio bounds for the canvas. We clamp the max to keep GPUs sane
 * on 4K displays, and drop to 1 on small (mobile) viewports.
 */
export function canvasDpr(): [number, number] {
  const isMobile = window.innerWidth < 768;
  return isMobile ? [1, 1] : [1, 2];
}
