PROJECT: Airbooks — 3D Book Page Flip Physics Engine
TASK: Reimplement the page flip system with realistic, direction-aware,
scroll-driven page deformation that feels like actual paper physics.

═══════════════════════════════════════════════════════════════════════
PROBLEM WITH CURRENT IMPLEMENTATION
═══════════════════════════════════════════════════════════════════════

The current book-reader.tsx uses a simple CSS rotateY() transform with
a skew for "paper curl." The problems:

1. FORWARD and BACKWARD flips look IDENTICAL — just mirrored. A real
   book has different physics: pulling a page forward from the right
   lifts from the top-right corner and curls OVER, while flipping back
   from the left peels from the top-left and curls UNDER.

2. The page is a RIGID plane that rotates — there's no actual bending,
   no paper deformation. Real paper CURVES as it flips.

3. Scroll/drag progress is linearly mapped to rotation angle. Real
   paper has RESISTANCE at the start (sticking to the stack), FAST
   movement in the middle (once free), and SETTLING at the end (landing).

4. No page thickness — the flipping page looks like an infinitely thin
   sheet. Real pages have visible paper edge thickness.

5. No multi-page awareness — you can't see the next few pages peeking
   underneath, and there's no visible "stack" getting thicker on one side.

═══════════════════════════════════════════════════════════════════════
THE NEW PAGE FLIP SYSTEM — REQUIREMENTS
═══════════════════════════════════════════════════════════════════════

Build a complete page flip engine that:

A) Uses a DEFORMABLE mesh (subdivided plane, not a flat div)
B) Responds to scroll/drag with PHYSICS-BASED deformation
C) Flip FORWARD and flip BACKWARD look and feel DIFFERENT
D) The deformation is CONTINUOUS — you can stop mid-flip and the page
   holds its bent shape, then springs back or completes
E) Renders inside the Three.js world (WebGL, part of the 3D scene)
F) PDF content is rendered as TEXTURE on the deformable mesh
G) Has a CSS-only FALLBACK for devices without WebGL support

═══════════════════════════════════════════════════════════════════════
PHYSICS MODEL — HOW REAL PAPER BEHAVES
═══════════════════════════════════════════════════════════════════════

FORWARD FLIP (right page turning to the left — reading forward):
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Phase 1: LIFT (progress 0% → 15%)                               │
│  - Top-right corner lifts first                                  │
│  - Rest of page stays flat (only corner peels)                   │
│  - Slight shadow appears under the lifted corner                 │
│  - Sound: faint paper-unstick                                    │
│                                                                   │
│  Phase 2: CURL (progress 15% → 60%)                              │
│  - Page wraps around a virtual CYLINDER                          │
│  - Cylinder axis is vertical (at the spine)                      │
│  - The curl radius DECREASES as you pull further (tighter bend)  │
│  - Page content is visible on the front face                     │
│  - The BACK of the page becomes visible (next page content or    │
│    slightly darker paper color)                                   │
│  - Paper translucency: light bleeds through slightly             │
│  - Shadow under the curled page falls on the page beneath        │
│  - A slight WAVE ripple propagates from the curl edge            │
│                                                                   │
│  Phase 3: FALL (progress 60% → 90%)                              │
│  - Page is now past vertical, falling to the left side           │
│  - Curl relaxes (radius increases — paper straightening)         │
│  - Gravity pulls the free edge DOWN slightly (sag)               │
│  - Speed increases (acceleration from gravity)                   │
│                                                                   │
│  Phase 4: SETTLE (progress 90% → 100%)                           │
│  - Page lands flat on the left stack                             │
│  - Brief compression bounce (page lifts 2px then settles)        │
│  - Air puff: nearby page edges flutter very slightly             │
│  - Shadow snaps to resting gutter position                       │
│  - Sound: soft paper thud                                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

BACKWARD FLIP (left page turning back to the right — going back):
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Phase 1: PEEL (progress 0% → 15%)                               │
│  - Top-LEFT corner lifts                                         │
│  - The page peels from the left stack                            │
│  - Curl direction is REVERSED (bends toward you, not away)       │
│  - Less curl intensity (you're unfolding, not folding)           │
│                                                                   │
│  Phase 2: REVERSE CURL (progress 15% → 60%)                     │
│  - Page wraps around cylinder from the OTHER direction           │
│  - The back face (what was the previous left-side content)       │
│    becomes visible                                               │
│  - Curl is GENTLER than forward (wider radius — feels like       │
│    you're carefully lifting)                                      │
│  - Shadow falls on the RIGHT page (opposite of forward)          │
│                                                                   │
│  Phase 3: SWING (progress 60% → 90%)                             │
│  - Page swings rightward                                         │
│  - Straightens more aggressively (snapping back)                 │
│                                                                   │
│  Phase 4: LAND (progress 90% → 100%)                             │
│  - Lands on right stack with a slightly different character      │
│  - Landing is SOFTER (the "return" gesture feels lighter)        │
│  - Minimal bounce                                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
SCROLL/DRAG → DEFORMATION MAPPING
═══════════════════════════════════════════════════════════════════════

The user drives the flip via:
1. Mouse drag (click and pull)
2. Trackpad scroll (horizontal scroll on the book area)
3. Touch swipe (mobile)
4. Hand gesture (Mediapipe swipe — continuous delta, not discrete)
5. Keyboard arrow (triggers auto-flip animation)
6. Click nav buttons (triggers auto-flip)

For CONTINUOUS inputs (drag, scroll, gesture):
- Map the input delta to flip PROGRESS (0 to 1)
- The page deformation is a FUNCTION of progress
- At any point the user can:
  - STOP: page holds its current bent shape (like holding a page mid-turn)
  - REVERSE: page unbends and returns (spring physics)
  - COMMIT: if past 35% threshold, release triggers auto-complete
  - ACCELERATE: fast swipe = the flip animates to completion with velocity

Input-to-progress mapping (NON-LINEAR — feels like real resistance):
- First 15%: HIGH resistance (easeIn cubic — page is "stuck" to stack)
  - User must drag 40% of page width to reach 15% progress
- 15-60%: LINEAR (page moves freely once unstuck)
- 60-100%: LOW resistance (easeOut — gravity assists, page wants to fall)
  - Only need 20% more drag to go from 60 to 100

On RELEASE:
- If progress < 35%: spring back to 0% (snap back animation)
  - Spring physics: stiffness 300, damping 20
  - Duration: ~300ms
- If progress >= 35%: spring forward to 100% (complete the flip)
  - Velocity-aware: faster release = faster completion
  - Duration: 200-600ms depending on remaining distance and release velocity

═══════════════════════════════════════════════════════════════════════
VERTEX DEFORMATION — THE MATH
═══════════════════════════════════════════════════════════════════════

Page geometry: PlaneGeometry with subdivisions (24 segments wide × 32 tall)
This gives ~800 vertices that can be individually displaced.

For each vertex at position (x, y) on the page (normalized 0-1):

FORWARD FLIP deformation at progress P:

  // Cylinder position moves from right edge (P=0) to left edge (P=1)
  cylinderX = 1.0 - P

  // Curl radius: tight in middle, relaxed at start/end
  curlRadius = 0.15 + 0.3 * (1.0 - sin(P * PI))

  // Only vertices PAST the cylinder get curled
  if (vertex.x > cylinderX):
    // Angle around the cylinder
    angle = (vertex.x - cylinderX) / curlRadius
    angle = min(angle, PI)  // cap at 180°

    // New position: wrapped around cylinder
    newX = cylinderX + curlRadius * sin(angle)
    newZ = curlRadius * (1.0 - cos(angle))

    // Apply
    vertex.x = newX
    vertex.z = newZ

  // Gravity sag on free edge (more sag in middle of page height)
  sagFactor = sin(vertex.y * PI) * 0.03 * sin(P * PI)
  vertex.z -= sagFactor

  // Wave ripple (propagates from curl line)
  wavePhase = (vertex.x - cylinderX) * 8.0 + time * 3.0
  waveAmp = 0.005 * sin(P * PI) * smoothstep(cylinderX, cylinderX + 0.3, vertex.x)
  vertex.z += sin(wavePhase) * waveAmp

  // Corner lift (more deformation at top-right corner at low progress)
  if (P < 0.15):
    cornerDist = distance(vertex, topRightCorner)
    cornerLift = (1.0 - cornerDist) * P * 0.5
    vertex.z += cornerLift

BACKWARD FLIP deformation at progress P:

  // Cylinder moves from LEFT edge to right
  cylinderX = P

  // Wider curl radius (gentler peel)
  curlRadius = 0.2 + 0.35 * (1.0 - sin(P * PI))

  // Vertices LEFT of cylinder get curled (opposite direction)
  if (vertex.x < cylinderX):
    angle = (cylinderX - vertex.x) / curlRadius
    angle = min(angle, PI)

    // Curl goes the OTHER way (negative Z first, then wraps over)
    newX = cylinderX - curlRadius * sin(angle)
    newZ = curlRadius * (1.0 - cos(angle)) * -0.8  // less aggressive

    vertex.x = newX
    vertex.z = newZ

  // Softer sag (backward flip is lighter)
  sagFactor = sin(vertex.y * PI) * 0.02 * sin(P * PI)
  vertex.z -= sagFactor

═══════════════════════════════════════════════════════════════════════
VISUAL EFFECTS DURING FLIP
═══════════════════════════════════════════════════════════════════════

1. DYNAMIC SHADOW:
   - The curling page casts a shadow on the page below
   - Shadow shape follows the curl line (not a simple rectangle)
   - Shadow intensity: peaks at P=0.5, fades at extremes
   - Implementation: a second mesh underneath, slightly offset, with
     shadow material (black, opacity 0.2-0.4, blur via scale)

2. SPECULAR HIGHLIGHT:
   - A bright line that runs along the curl's apex
   - Simulates light catching the curved paper surface
   - Moves with the curl cylinder position
   - Color: white at 15% opacity for light themes, blue-ish for dark themes

3. PAGE TRANSLUCENCY:
   - Where the page is tightly curled, light shows through
   - The BACK side content (or a slightly visible reversed image) appears
   - Implementation: in the fragment shader, mix front and back textures
     based on curl tightness (angle > 90° → start showing back)

4. FOLD CREASE:
   - A subtle darkened line at the cylinder position
   - Simulates the "fold" where paper bends
   - Faint, ~1px wide, color: darken the page color by 10%

5. PAGE EDGE THICKNESS:
   - The flipping page should show its EDGE (paper is not zero-thickness)
   - Add a thin extruded edge (0.002 units) visible when page is at angle
   - Color: cream/off-white (#F5F0E8)

6. STACK AWARENESS:
   - Left stack (pages read) gets visually THICKER as you read
   - Right stack (remaining) gets thinner
   - Visible as a slightly raised surface on each side
   - Implementation: adjust the y-position of stack meshes based on
     currentPage / totalPages

═══════════════════════════════════════════════════════════════════════
IMPLEMENTATION STRUCTURE
═══════════════════════════════════════════════════════════════════════

Create these files:

src/app/book-3d/
├── page-flip-engine.ts      — State machine + physics calculations
├── page-geometry.ts         — Creates subdivided PlaneGeometry
├── page-deformer.ts         — Vertex deformation functions (forward/back)
├── page-material.tsx        — Custom ShaderMaterial for page rendering
├── page-shadow.tsx          — Dynamic shadow mesh beneath flipping page
├── book-mesh.tsx            — The full 3D book (covers, spine, page stacks)
├── flip-interaction.ts      — Input handling (drag, scroll, gesture → progress)
├── flip-animation.ts        — Spring physics for auto-complete/snap-back
└── shaders/
    ├── page.vert            — Vertex shader (deformation)
    └── page.frag            — Fragment shader (translucency, highlight)

═══════════════════════════════════════════════════════════════════════
PAGE FLIP ENGINE — STATE MACHINE
═══════════════════════════════════════════════════════════════════════

States:
  IDLE         — No flip in progress, pages flat
  DRAGGING     — User actively controlling progress (continuous)
  ANIMATING    — Auto-completing or snapping back (spring physics)
  SETTLING     — Brief bounce/flutter after page lands

Transitions:
  IDLE → DRAGGING:       User starts drag/scroll on a page
  DRAGGING → ANIMATING:  User releases (decide: snap back or complete)
  DRAGGING → IDLE:       User drags back to 0% and releases
  ANIMATING → SETTLING:  Animation reaches 100% (page landed)
  SETTLING → IDLE:       Bounce animation completes (~150ms)

  Any state → IDLE:      Cancel/interrupt (e.g., keyboard Escape)

State data:
  {
    state: 'idle' | 'dragging' | 'animating' | 'settling',
    direction: 'forward' | 'backward',
    progress: number,          // 0-1, current deformation amount
    velocity: number,          // units/sec, for momentum
    targetProgress: number,    // where the spring is heading (0 or 1)
    dragStartX: number,        // screen px where drag began
    pageWidth: number,         // for calculating drag-to-progress ratio
  }

═══════════════════════════════════════════════════════════════════════
SCROLL INPUT — SPECIFICALLY
═══════════════════════════════════════════════════════════════════════

For trackpad/mouse wheel horizontal scroll on the book area:

- Listen for 'wheel' events on the book container div
- Use deltaX (horizontal scroll) as the input
- Accumulate deltaX into a "scroll pool" that maps to progress:

  scrollPool += event.deltaX
  targetProgress = clamp(scrollPool / SCROLL_DISTANCE, 0, 1)

  SCROLL_DISTANCE = 300px (total scroll needed for a full page flip)

- Direction detection:
  - deltaX > 0 (scroll right) → flip FORWARD (next page)
  - deltaX < 0 (scroll left) → flip BACKWARD (previous page)

- Momentum handling:
  - When scroll events STOP (no event for 100ms), treat as "release"
  - Apply snap-back or auto-complete based on current progress

- Overscroll prevention:
  - If at first page, backward scroll does a subtle "bounce" (progress
    reaches max 0.08 then springs back)
  - If at last page, forward scroll bounces similarly
  - This gives tactile feedback that you've hit the boundary

═══════════════════════════════════════════════════════════════════════
SPRING PHYSICS — AUTO-COMPLETE / SNAP-BACK
═══════════════════════════════════════════════════════════════════════

Use a simple spring simulation (no library needed):

  class Spring {
    value: number = 0;
    velocity: number = 0;
    target: number = 0;
    stiffness: number = 200;    // Higher = snappier
    damping: number = 20;       // Higher = less oscillation
    mass: number = 1;

    update(dt: number): boolean {  // returns true when settled
      const force = -this.stiffness * (this.value - this.target);
      const dampingForce = -this.damping * this.velocity;
      const acceleration = (force + dampingForce) / this.mass;

      this.velocity += acceleration * dt;
      this.value += this.velocity * dt;

      // Settled check
      const isSettled = Math.abs(this.value - this.target) < 0.001
                     && Math.abs(this.velocity) < 0.01;
      if (isSettled) this.value = this.target;
      return isSettled;
    }
  }

For auto-complete (progress → 1):
  - stiffness: 180
  - damping: 22
  - Initial velocity: carry over from user's release velocity

For snap-back (progress → 0):
  - stiffness: 250 (snappier — page "wants" to go back)
  - damping: 25
  - Feels like releasing a held page — it snaps back fast

For settle bounce (at landing):
  - stiffness: 400
  - damping: 30
  - Tiny amplitude: start at progress 1.02, target 1.0 (2% overshoot)
  - Duration: ~120ms

═══════════════════════════════════════════════════════════════════════
PDF CONTENT AS TEXTURE
═══════════════════════════════════════════════════════════════════════

The existing usePdfPageImage hook renders PDF pages to canvas.toDataURL().
For the 3D version:

1. Render PDF page to an OffscreenCanvas (or regular canvas)
2. Create a THREE.CanvasTexture from it (updates when page changes)
3. Apply as the `map` on the page's ShaderMaterial
4. The fragment shader samples this texture based on UV coordinates
5. UVs are preserved during vertex deformation (they're defined on
   the undeformed geometry and carried through)

For the BACK face of the page:
- Render the NEXT page number (since the back of page N shows page N+1
  when flipping forward)
- Apply as a separate texture, sampled when the face is flipped
  (normal pointing away from camera)
- OR: use the back-face of the shader with a flipped UV lookup

═══════════════════════════════════════════════════════════════════════
RESPONSIVE DESIGN — BOOK SIZE
═══════════════════════════════════════════════════════════════════════

The 3D book dimensions should be RESPONSIVE to viewport:
- Desktop (>1024px): Full spread, two pages visible, page width ~380px equiv
- Tablet (768-1024px): Slightly smaller spread, same aspect ratio
- Mobile (<768px): SINGLE page view (no spread), full-width page
  - Flip becomes a simple page turn (one page at a time)
  - Swipe left/right to flip

In the 3D scene, the book mesh scales based on viewport:
  const pageScale = viewport.width > 1024 ? 1.0
                  : viewport.width > 768 ? 0.85
                  : 0.7;

═══════════════════════════════════════════════════════════════════════
FALLBACK — CSS-ONLY VERSION (NO WEBGL)
═══════════════════════════════════════════════════════════════════════

For devices without WebGL or with prefer-reduced-motion:

Keep an enhanced version of the CURRENT CSS approach but add:
1. Different easing for forward vs backward:
   - Forward: cubic-bezier(0.2, 0.8, 0.3, 1.0) — fast start, soft land
   - Backward: cubic-bezier(0.4, 0.0, 0.2, 1.0) — careful lift, quick return
2. Multiple shadow layers that animate separately (creates depth illusion)
3. The skewY curl effect varies based on direction:
   - Forward: positive skew (curling away)
   - Backward: negative skew (curling toward)
4. A pseudo-element for the back-face with slightly darker background

═══════════════════════════════════════════════════════════════════════
INTEGRATION WITH EXISTING BOOK READER
═══════════════════════════════════════════════════════════════════════

The new 3D page flip system should be used INSIDE the existing
BookReaderCore component or as a replacement. Strategy:

1. Create a new <Book3DReader /> component that:
   - Accepts the same props as BookReaderCore (book, pdfBuffer, etc.)
   - Uses the PageFlipEngine for deformation
   - Renders inside the World canvas (as a 3D mesh positioned on the desk)
   - PDF textures come from the existing usePdfPageImage hook (reuse!)

2. The existing BookReaderCore can remain as the CSS FALLBACK:
   - Detect WebGL support at runtime
   - If supported → render Book3DReader
   - If not → render current BookReaderCore (enhanced with better easing)

3. In the reading view:
   - The World camera moves to the "reader" position
   - The 3D book mesh appears on the desk in the environment
   - The HTML overlay shows: progress bar, header chrome (auto-hiding)
   - Page content is BOTH a 3D texture AND readable text (for accessibility,
     the HTML text overlay sits above for screen readers)

═══════════════════════════════════════════════════════════════════════
ACCEPTANCE CRITERIA
═══════════════════════════════════════════════════════════════════════

✅ Forward page flip shows corner lift → curl → fall → settle
✅ Backward page flip shows peel → reverse curl → swing → soft land
✅ Forward and backward look visually DISTINCT (different curl direction,
   different radius, different shadow placement)
✅ Drag/scroll controls progress CONTINUOUSLY (page bends in real-time)
✅ Releasing mid-flip: below 35% snaps back, above 35% completes
✅ Spring physics feels natural (no linear animations)
✅ Settle bounce at landing (subtle, 2% overshoot then dampens)
✅ Dynamic shadow follows the curl shape
✅ Specular highlight line on curl apex
✅ Page edge thickness visible during flip
✅ PDF content renders correctly as texture on deformed mesh
✅ Performance: 60fps on mid-range hardware (laptop with integrated GPU)
✅ Mobile: single-page mode with touch swipe
✅ Keyboard arrows trigger auto-flip with nice animation curve
✅ Scroll boundary bounce (can't flip past first/last page)
✅ WebGL fallback: enhanced CSS version with direction-aware easing
