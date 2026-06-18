# Airbooks: Polished Product Development Document & Roadmap

## 1. Vision & Core Philosophy

**Airbooks** aims to redefine the digital reading experience by transforming static PDF documents into dynamic, immersive, and tactile interactive environments. Our vision is to empower users to **share, read, create, and embed** PDFs within a multitude of meticulously crafted themes, rich aesthetics, and realistic 3D flipable books, all while engaging with the content using intuitive gesture controls powered by Mediapipe.

We envision a world where a digital book feels just as grounded and atmospheric as a physical one—complete with responsive 3D lighting, ambient sounds, and a seamless, almost magical interface.

### Core Pillars
- **Read:** Immerse yourself in a distraction-free, 3D flipable reader.
- **Create:** Easily import, customize, and stylize PDFs with unique covers and metadata.
- **Share & Embed:** Seamlessly distribute your personalized reading experience across the web via shareable links and embeddable iframe widgets.
- **Control:** Navigate effortlessly with advanced AI hand-tracking gestures.

---

## 2. Aesthetic Themes & Realistic 3D Environments

The visual experience in Airbooks is driven by highly configurable themes that alter not just colors, but lighting, shadows, paper textures, and the overall ambient environment.

### Existing Foundation
- **Flip Themes (`flip-themes.ts`):** Defines the 3D book cover, spine gradients, realistic lighting (specular highlights, dynamic shadows, gutter shadows, crease lines), and corner peel effects. Current themes: *Classic*, *Night*, *Sepia*, *Minimal*.
- **Reader Themes (`reader-themes.ts`):** Controls the UI surrounding the book, such as background colors, text colors, and metadata highlights. Current themes: *Parchment*, *Dark*, *Sepia*, *White*.

### The Polished Vision: 3D Immersive Environments
To elevate the product, we will expand "Themes" into "Environments":
- **Dynamic 3D Lighting:** Implement WebGL/Three.js-backed or advanced CSS3D lighting models where specular highlights shift dynamically as the user flips the page or moves their mouse/hand.
- **Atmospheric Backgrounds:** Transition from static CSS gradients to subtle animated backgrounds (e.g., softly flickering candlelight for 'Night', dusty sunbeams for 'Sepia').
- **Material Realism:** Enhance the existing SVG noise filters (paper textures) with variable roughness and bump mapping for a true tactile feel.
- **Responsive Geometry:** Ensure the 3D page flip curves naturally, respecting the stiffness of the paper and the speed of the user's swipe.

---

## 3. Advanced Gesture Controls (Mediapipe)

Our integration of `@mediapipe/tasks-vision` allows for a touchless, magical interaction layer.

### Current Implementation (`hand-tracking-provider.tsx`)
- **Pointer/Hover:** Index finger navigation with dead-zone smoothing.
- **Swipe:** Detects rapid horizontal hand movement to trigger page flips.
- **Pinch:** Simulates a click (index and thumb touch).
- **Fist (Magic Summon):** Holding a fist summons an AI assistant or menu.

### Enhancements for the Polished Product
- **Granular Flip Control:** Instead of a discrete swipe triggering a full animation, bind the horizontal position of the user's hand directly to the page flip progress. A slow swipe peels the page slowly; reversing the hand drops the page back.
- **Z-Axis Depth:** Utilize the size of the detected hand landmarks to estimate depth, allowing users to "push" to zoom in or "pull" to zoom out.
- **Two-Handed Gestures:** Support for two hands (e.g., holding the book open with one hand, flipping with the other, or pinch-to-zoom using both hands).
- **Robustness:** Improve the Exponential Moving Average (EMA) smoothing and Kalman filtering to eliminate jitter, especially in low-light conditions. Add a visual calibration guide for first-time users.

---

## 4. Ambient Sound Integration

Audio is critical for immersion. We will introduce an audio manager that dynamically mixes sound effects (SFX) and background ambiance based on the active theme and user interactions.

### Sound Design Plan
1. **Interactive SFX:**
   - **Page Peel:** A soft rustle that plays variably based on the speed of the hand-tracked page peel.
   - **Page Snap/Drop:** A crisp, satisfying thud/snap when a page flip completes.
   - **UI Clicks:** Subtle, woody or glassy tones for menu interactions.
2. **Environmental Ambiance (Tied to Themes):**
   - **Classic/Minimal:** Faint, warm library room tone, occasional distant page turns or soft breathing.
   - **Night:** Soft crickets, gentle wind, a crackling fireplace, or low-fi ambient synth drones.
   - **Sepia:** Vintage gramophone crackle, gentle rain against a window.
3. **Implementation:**
   - Use the Web Audio API to crossfade ambient tracks when themes change.
   - Map the page-flip progress to the playback rate or volume of the rustle SFX for 1:1 tactile audio feedback.

---

## 5. Technical Architecture & Component Refactoring

### Frontend Stack
- **Framework:** React 18 / React Router v7 / Vite
- **Styling:** Tailwind CSS + Radix UI + Framer Motion
- **PDF Rendering:** PDF.js (v4.4.168) rendered onto high-DPI canvases.
- **3D/Animation:** Custom CSS 3D transforms + Framer Motion (`tw-animate-css`). Future: Three.js/React-Three-Fiber for advanced lighting.
- **AI/Vision:** `@mediapipe/tasks-vision` executed in requestAnimationFrame loops.

### Backend & Storage
- **Database/Auth:** Supabase (`@supabase/supabase-js`).
- **File Storage:** PDFs and covers are stored in Supabase Storage buckets, heavily cached via Edge CDNs.
- **Embeds:** Iframe-friendly standalone routes (`/embed/:shareId`) that strip UI and maximize the reader.

---

## 6. Minute-by-Minute Development Roadmap

This roadmap details the precise execution plan for reaching the polished product milestone.

### Phase 1: Environment & Audio Immersion (Days 1-3)
- **Day 1, 09:00 - 12:00:** Refactor `flip-themes.ts` to include configuration for sound loops and dynamic lighting coordinates.
- **Day 1, 13:00 - 17:00:** Implement `AudioManager` class using Web Audio API. Source and compress ambient MP3s and page-rustle WAVs.
- **Day 2, 09:00 - 15:00:** Hook `AudioManager` into `BookReaderCore`. Play rustle sounds proportionally during drag/flip events. Crossfade ambiances on theme switch.
- **Day 3:** Polish CSS3D shadows. Add dynamic radial gradients to the `BookReader` background that subtlely shift based on mouse/hand cursor position to simulate a light source.

### Phase 2: Mediapipe Gesture Overhaul (Days 4-5)
- **Day 4, 09:00 - 14:00:** Update `hand-tracking-provider.tsx`. Replace boolean swipe detection with a continuous horizontal delta output.
- **Day 4, 14:00 - 18:00:** Bind the continuous hand delta to the Framer Motion `progress` value of the active page in `book-reader.tsx`. Ensure physics-based snap-back on release.
- **Day 5:** Implement z-axis scaling for zoom, and create a visual "Hand Tracking Active" calibration overlay.

### Phase 3: Create, Share, & Embed Polishing (Days 6-7)
- **Day 6:** Enhance the `/embed/:shareId` route (`embed.tsx`). Ensure the iframe sends and receives `postMessage` events for external control (e.g., host site telling the iframe to flip a page).
- **Day 7:** Polish the Create/Upload flow (`add-book-modal.tsx`). Add automatic PDF cover extraction (rendering page 1 to a thumbnail) instead of relying solely on solid colors. Ensure metadata syncs flawlessly to Supabase.

### Phase 4: Performance & Final QA (Day 8)
- **09:00 - 12:00:** Optimize PDF.js worker memory. Implement a rolling cache in `pdf-store.ts` that evicts pages > 5 steps away from the current page to prevent mobile crashes.
- **12:00 - 15:00:** Audit bundle size. Lazy load Mediapipe models only when the user explicitly enables camera tracking.
- **15:00 - 18:00:** End-to-end testing across Chrome, Safari, and mobile devices (touch fallback verification).

---
*End of Document*
