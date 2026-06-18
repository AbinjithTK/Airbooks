PROJECT: Airbooks — Immersive 3D Reading Platform
TASK: Phase 1 — Establish the 3D World Layer (Foundation)

═══════════════════════════════════════════════════════════════════════
CONTEXT
═══════════════════════════════════════════════════════════════════════

Airbooks is a React 18 + Vite + Tailwind CSS app that lets users read,
share, and embed PDF books. It uses Supabase for auth/storage, pdfjs-dist
for rendering, and Framer Motion for animation.

We are transforming the app so that the ENTIRE UI exists inside a persistent
3D environment. The 3D world is always running — from login through library
through reading. UI elements float as glass-morphism panels over the 3D scene.

Current tech stack:
- React 18 / React Router 7 / Vite 6
- Tailwind CSS 4 / Radix UI / Framer Motion ("motion" package)
- @supabase/supabase-js for auth
- pdfjs-dist 4.4.168 for PDF rendering
- Package manager: pnpm
- The app entry is src/app/App.tsx which renders AuthProvider > RouterProvider

═══════════════════════════════════════════════════════════════════════
OBJECTIVE
═══════════════════════════════════════════════════════════════════════

Implement the foundational "World Layer" that:
1. Installs Three.js ecosystem (react-three-fiber, drei, postprocessing)
2. Creates a WorldProvider that wraps the entire app with a persistent
   full-screen Three.js canvas
3. Builds the first 3D environment: "Library Study" (warm, scholarly room
   with lamp, bookshelves, dust particles)
4. Implements a CameraRig that smoothly transitions between view states
   (login, library, reader)
5. Rebuilds the login/auth screen as a glass-morphism card floating over
   the 3D world
6. All existing functionality MUST continue working — this is additive,
   not destructive

═══════════════════════════════════════════════════════════════════════
STEP 1: INSTALL DEPENDENCIES
═══════════════════════════════════════════════════════════════════════

Run:
  pnpm add three @react-three/fiber @react-three/drei @react-three/postprocessing
  pnpm add -D @types/three

These provide:
- three: Core WebGL/3D library
- @react-three/fiber: React renderer for Three.js (declarative scene graph)
- @react-three/drei: Utility helpers (lights, controls, particles, materials)
- @react-three/postprocessing: Bloom, depth-of-field, vignette effects

═══════════════════════════════════════════════════════════════════════
STEP 2: CREATE THE WORLD PROVIDER
═══════════════════════════════════════════════════════════════════════

Create: src/app/world/world-provider.tsx

This component:
- Creates a React context (WorldContext) that exposes:
  - currentView: 'login' | 'library' | 'reader' | 'writer'
  - environment: 'library-study' (only one for now, more later)
  - setView(view): triggers camera animation
  - setEnvironment(env): triggers environment crossfade
- Renders a <Canvas> from @react-three/fiber as a FIXED full-screen
  element (position: fixed, inset: 0, z-index: 0)
- Canvas settings:
  - shadows enabled
  - antialias: true
  - toneMapping: THREE.ACESFilmicToneMapping
  - toneMappingExposure: 1.1
  - camera: { position: [0, 2.5, 6], fov: 45 }
  - dpr: [1, 2] (device pixel ratio clamped for performance)
- Inside Canvas, renders:
  - <WorldScene /> (the 3D content)
- After Canvas, renders {children} in a relative z-10 div (HTML overlay)

The WorldProvider wraps the entire app in App.tsx:
  AuthProvider > WorldProvider > RouterProvider

═══════════════════════════════════════════════════════════════════════
STEP 3: CREATE THE WORLD SCENE
═══════════════════════════════════════════════════════════════════════

Create: src/app/world/world-scene.tsx

WorldScene contains:
1. <EnvironmentRenderer /> — renders the active 3D environment
2. <CameraRig /> — manages smooth camera transitions
3. <SceneContent /> — renders view-specific 3D objects (login book, shelf, etc.)
4. <EffectComposer> with:
   - <Bloom luminanceThreshold={0.8} intensity={0.3} radius={0.6} />
   - <Vignette eskil={false} offset={0.15} darkness={0.5} />

═══════════════════════════════════════════════════════════════════════
STEP 4: CAMERA RIG
═══════════════════════════════════════════════════════════════════════

Create: src/app/world/camera-rig.tsx

The CameraRig:
- Gets the current view from WorldContext
- Has predefined camera positions for each view:
  - login:   position [0, 2.5, 6],   lookAt [0, 1.5, 0]
  - library: position [0, 2.0, 4.5], lookAt [0, 1.2, 0]
  - reader:  position [0, 2.8, 2.2], lookAt [0, 1.0, 0]
  - writer:  position [0, 2.5, 2.5], lookAt [0, 1.1, -0.3]
- Uses useFrame to smoothly lerp camera.position toward target (lerp factor: delta * 1.2)
- Smoothly interpolates the lookAt target too (using a separate Vector3)
- Adds subtle "breathing" drift:
  - camera.position.x += Math.sin(time * 0.15) * 0.015
  - camera.position.y += Math.cos(time * 0.12) * 0.008

═══════════════════════════════════════════════════════════════════════
STEP 5: LIBRARY STUDY ENVIRONMENT
═══════════════════════════════════════════════════════════════════════

Create: src/app/world/environments/library-study.tsx

Build a warm, scholarly room programmatically using Three.js primitives:

A) ROOM STRUCTURE:
- Back wall: large plane at z=-4, width 14, height 7
  - Material: MeshStandardMaterial, color #2C1810, roughness 0.9
- Floor: plane rotated -90° on x-axis, at y=-0.5
  - Use MeshReflectorMaterial from drei (blur: [300,100], resolution: 512,
    mixBlur: 1, mixStrength: 0.2, color: "#1a0e05", roughness: 0.8)
- Side walls (optional, subtle): planes at x=-5 and x=5, angled slightly

B) LIGHTING:
- Ambient light: intensity 0.12, color "#FFE4C4" (warm)
- Main desk lamp (point light):
  - Position: [-1.5, 2.2, 0.5]
  - Color: "#FFD89B"
  - Intensity: 2.5 (with subtle flicker: 2.5 + sin(time*3) * 0.08)
  - Distance: 8, decay: 2, castShadow: true
- Secondary fill light:
  - Position: [3, 3, 2]
  - Color: "#B4D4FF" (cool blue moonlight from window)
  - Intensity: 0.3
- Lamp mesh: cone geometry (radius 0.3, height 0.4, openEnded: true)
  - Material: MeshStandardMaterial, color "#8B4513", emissive "#3a1a00"
    intensity 0.3, side: DoubleSide
  - Small sphere inside (radius 0.05) with MeshBasicMaterial color "#FFAA44"

C) FURNITURE:
- Desk: box geometry [2.5, 0.08, 1.2] at position [0, 0.8, 0.5]
  - Material: MeshStandardMaterial, color "#5C3317", roughness 0.6,
    metalness 0.05
  - Four legs: thin cylinders at corners

- Bookshelves (two, flanking):
  - Left shelf group at [-3.5, 0, -2.5]
  - Right shelf group at [3.5, 0, -2.5]
  - Each shelf: 3 horizontal planks (box [1.8, 0.04, 0.3]) at heights
    1.0, 1.8, 2.6
  - Books on shelves: box geometries of varying height (0.7-1.2),
    width (0.06-0.12), depth 0.2
  - Book colors: randomly picked from ["#8B0000", "#00308F", "#2E4600",
    "#4A0E4E", "#8B4513", "#1C1C1C", "#654321", "#191970"]
  - 8-12 books per shelf, arranged with slight random gaps

D) ATMOSPHERIC EFFECTS:
- Fog: <fog attach="fog" args={['#0a0500', 6, 18]} />
- Dust particles: use <Sparkles> from drei:
  - count: 60
  - scale: [8, 5, 8]
  - size: 1.5
  - speed: 0.15
  - opacity: 0.25
  - color: "#FFE4C4"
- Window glow (back-right): a plane with emissive material
  simulating moonlit window
  - Position: [4, 2.5, -3.5]
  - Slight blue glow

═══════════════════════════════════════════════════════════════════════
STEP 6: LOGIN SCENE CONTENT
═══════════════════════════════════════════════════════════════════════

Create: src/app/world/scenes/login-scene.tsx

When the view is 'login', render in the 3D scene:
- A single decorative closed book floating and slowly rotating
  - Position: [0, 1.8, 0]
  - Rotation: slowly increment rotationY (time * 0.2)
  - Gentle float: y += sin(time * 0.5) * 0.08
  - The book is a group of meshes:
    - Cover (front): box [1.0, 1.4, 0.02], color "#0F6FFF", slight metalness
    - Cover (back): same, offset on z
    - Spine: box [0.08, 1.4, 0.06], connecting covers
    - Page block: box [0.95, 1.35, 0.04], color "#F5F0E8" (cream)
  - Spotlight on the book: position [0, 4, 3], angle 0.4, penumbra 0.8,
    intensity 1.5

═══════════════════════════════════════════════════════════════════════
STEP 7: REBUILD AUTH PAGE AS GLASS OVER 3D
═══════════════════════════════════════════════════════════════════════

Create: src/app/components/auth-page-v2.tsx

Replace the existing AuthPage with a glass-morphism design that floats over
the 3D world. The 3D scene is visible behind/around the card.

Design:
- Centered card, max-width: 420px
- Background: rgba(10, 15, 30, 0.6)
- backdrop-filter: blur(40px) saturate(1.2)
- Border: 1px solid rgba(255, 255, 255, 0.08)
- Border-radius: 24px
- Box-shadow: 0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)
- Padding: 40px

Content inside the card:
- Logo: 56x56px rounded-2xl div with gradient from-[#0F6FFF] to-[#0EA5E9],
  BookOpen icon inside (white)
- Title: "AirBooks" — text-2xl font-bold text-white
- Subtitle: "Enter your reading world" — text-sm text-white/50
- Google button: glass-style (bg rgba(255,255,255,0.06), border rgba(255,255,255,0.1))
- Divider: "or" with side lines (white/10)
- Form fields:
  - Input style: bg rgba(255,255,255,0.04), border rgba(255,255,255,0.08),
    text-white, placeholder text-white/30, rounded-xl, py-3.5 px-4
  - Focus: border-color rgba(15,111,255,0.5), ring rgba(15,111,255,0.15)
  - Label icons in white/40
- Submit button: gradient #0F6FFF→#0EA5E9, rounded-xl, shadow-lg
  shadow-blue-500/25
- Toggle text: white/50 with blue link

Keep ALL existing auth logic from auth-context.tsx — just restyle the UI.

Also on this page: call setView('login') from WorldContext so the camera
targets the login position and the login 3D scene content renders.

═══════════════════════════════════════════════════════════════════════
STEP 8: WIRE THE LIBRARY VIEW
═══════════════════════════════════════════════════════════════════════

In the existing AppLayout (app-layout.tsx):
- After successful auth, call setView('library') from WorldContext
- This triggers the camera to smoothly dolly from login position to
  library position
- The login scene content (floating book) fades out
- The library content fades in (for now, just keep existing HTML bookshelf —
  we'll make it 3D in Phase 2)

═══════════════════════════════════════════════════════════════════════
STEP 9: PERFORMANCE SAFEGUARDS
═══════════════════════════════════════════════════════════════════════

- Add frameloop="demand" option that can be toggled (for low-end devices)
- Wrap Canvas in React.lazy with a Suspense fallback (loading shimmer)
- Add a "Reduce Motion" check: if user prefers-reduced-motion, skip
  particles and camera drift
- Keep canvas DPR at max 2 to avoid GPU strain on 4K screens
- The 3D scene should gracefully degrade: if WebGL2 is unavailable,
  fall back to a static gradient background (existing behavior)

═══════════════════════════════════════════════════════════════════════
STEP 10: FILE STRUCTURE
═══════════════════════════════════════════════════════════════════════

Create these new files:
  src/app/world/
  ├── world-provider.tsx         (Context + Canvas wrapper)
  ├── world-scene.tsx            (Scene orchestrator)
  ├── camera-rig.tsx             (Smooth camera transitions)
  ├── environments/
  │   ├── library-study.tsx      (First environment)
  │   └── index.tsx              (Environment switcher/registry)
  └── scenes/
      ├── login-scene.tsx        (Floating book for login view)
      └── library-scene.tsx      (Placeholder for Phase 2)

Modify these existing files:
  src/app/App.tsx                (Wrap with WorldProvider)
  src/app/components/app-layout.tsx (Call setView on auth state changes)
  src/app/components/auth-page.tsx  (Replace with glass-morphism v2 design)

═══════════════════════════════════════════════════════════════════════
IMPORTANT CONSTRAINTS
═══════════════════════════════════════════════════════════════════════

1. Do NOT break existing functionality. Auth, PDF reading, sharing must
   still work.
2. The existing book-reader.tsx should NOT be modified yet — that's Phase 2.
3. The 3D canvas must be pointer-events: none except for interactive 3D
   elements (none in Phase 1). All clicks go through to the HTML overlay.
4. Use TypeScript for all new files.
5. Import Three.js types properly (@types/three).
6. Test that the app still builds with `pnpm build` after changes.
7. The glass-morphism auth card must remain fully functional:
   - Google OAuth login
   - Email/password sign in and sign up
   - Error display
   - Loading states
8. Mobile-responsive: the 3D canvas should render at reduced resolution
   on mobile (check window.innerWidth < 768 → set DPR to 1).
9. Don't add audio yet — that's a later phase.
10. Environment switching UI is NOT needed yet — just hardcode
    'library-study' as the only environment.
