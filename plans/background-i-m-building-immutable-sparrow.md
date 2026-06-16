# AirBooks — Shareable PDF Books, CDN Storage, Themes & Enhanced Animation

## Context

Books are currently local-only: PDFs stored as in-memory `ArrayBuffer` (lost on refresh), metadata in `localStorage`. The goal is to turn AirBooks into a "new way of sharing digital publications" by:

1. **Persisting PDFs** via Supabase Storage (CDN) so share links work cross-device
2. **Shareable URLs** `/share/:id` — anyone can open and read the book
3. **Embeddable reader** `/embed/:id` — drop an `<iframe>` on any external site
4. **Multiple flip animation themes** — Classic, Night, Sepia, Minimal
5. **Reader background themes** — Parchment, Dark, Sepia, White
6. **Richer page-flip animation** — skew deformation, layered shadows, corner curl tip
7. **Higher-quality PDF rendering** — devicePixelRatio-aware, PDF document cache

---

## Implementation Sequence

### Step 1 — Supabase: prompt user to connect

Before writing any code, invoke the `supabase:supabase` skill to guide the user through connecting their Supabase project and creating the `airbooks-pdfs` bucket (public, anon reads + uploads).

### Step 2 — Types (`src/app/types.ts`)

Add to `Book` interface:
```ts
pdfUrl?: string;          // Supabase public URL
shareId?: string;         // same as id, explicit
flipTheme?: FlipTheme;    // 'classic' | 'night' | 'sepia' | 'minimal'
readerTheme?: ReaderTheme; // 'parchment' | 'dark' | 'sepia' | 'white'
```
Export `FlipTheme` and `ReaderTheme` string unions.

### Step 3 — Supabase client (`src/app/supabase-client.ts`) NEW

Install `@supabase/supabase-js`. Create:
- `supabase` client using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `uploadPdfToSupabase(bookId, buffer)` → returns public URL or `null`
- `uploadMetaJson(book)` → uploads `${bookId}.meta.json` with `{ title, author, pdfUrl, totalPages, coverColor }`
- `fetchMetaJson(shareId)` → fetches and returns the meta object

### Step 4 — PDF store (`src/app/pdf-store.ts`)

Extend with IndexedDB layer (bare API, no new library) and Supabase fetch fallback:
- Keep `hasPdf()` and `storePdf()` synchronous (existing callers unchanged)
- Add `storePdfPersistent(bookId, buffer)` → writes to memory + IndexedDB
- Add `getPdfAsync(bookId, pdfUrl?)` → memory → IndexedDB → `fetch(pdfUrl)`
- Add PDF document cache: `Map<string, Promise<PDFDocumentProxy>>` with `getOrLoadPdfDocument(bookId, buffer)` and `evictPdfDocument(bookId)`

### Step 5 — Add Book Modal (`src/app/components/add-book-modal.tsx`)

- Generate `bookId = Date.now().toString()` in `handleSubmit` (before calling `onAddBook`)
- After local store: call `uploadPdfToSupabase(bookId, buffer)` async, then `uploadMetaJson(book)`
- Pass `pdfUrl` and `preGeneratedId` through to `onAddBook`
- Show cloud upload progress state ("Uploading for sharing…") — non-blocking if it fails

### Step 6 — App Layout (`src/app/components/app-layout.tsx`)

- `handleAddBook` accepts optional `preGeneratedId` arg
- Calls `storePdfPersistent` instead of `storePdf`
- Stores `pdfUrl` in the new book object → persisted to `localStorage`

### Step 7 — Theme files (NEW)

`src/app/themes/flip-themes.ts` — `FlipThemeConfig` type + 4 theme objects (Classic/Night/Sepia/Minimal) with: `pageBackground`, `pageBackgroundBack`, `shadowColor`, `shadowIntensity`, `curlHighlight`, `gutterShadowColor`, `ambientBackground`, `bookShadowBox`, `paperTexture` flag.

`src/app/themes/reader-themes.ts` — `ReaderThemeConfig` type + 4 theme objects with: `pageBackground`, `textColor`, `metaColor`, `ruledLineColor`, `titleAccent`.

### Step 8 — Book Reader (`src/app/components/book-reader.tsx`)

**Theme system:**
- Add `activeFlipTheme` / `activeReaderTheme` local state (default: `'classic'` / `'white'`)
- Replace all hardcoded RGBA colors with theme config lookups via a `withAlpha(themeColor, alpha)` helper
- Apply `ambientBackground` to the reader outer wrapper
- Add theme switcher toolbar in header: 4 color swatches for flip theme, 4 "Aa" buttons for reader theme

**Enhanced flip animation:**
- Add `skewY` transform at mid-flip: `Math.sin(angleRad) * 4deg` — simulates paper curl
- Three shadow layers: ambient (broad), edge (tight crease), lift (corner tip at curlFactor > 0.6)
- Corner curl tip: 24×24px triangular div at bottom corner when curlFactor > 0.6
- Increased backface shadow depth (0.3 × sinAngle, spread 35%)
- Gutter shadow on static pages inner edges proportional to sinAngle

**PDF quality:**
- `usePdfPageImage` uses `window.devicePixelRatio` in scale calculation
- Call `getOrLoadPdfDocument(bookId, buffer)` instead of `pdfjsLib.getDocument()` per hook
- Evict document cache on reader unmount
- Replace `getPdf(bookId)` with `await getPdfAsync(bookId, book.pdfUrl)`

**Share button:**
- Add share icon button in reader header → opens `ShareModal`

### Step 9 — Share Modal (`src/app/components/share-modal.tsx`) NEW

Radix `Dialog` component with three sections:
1. **Share link** — `${origin}/share/${book.id}` + Copy button. If `!book.pdfUrl`: show "Upload to enable sharing" button that calls `uploadPdfToSupabase` on demand (reads from `getPdfAsync`), then `uploadMetaJson`, then updates `setBooks`.
2. **Embed code** — `<iframe src="${origin}/embed/${book.id}" …>` + Copy button
3. **Info** — "Anyone with this link can read this book"

### Step 10 — Routes (`src/app/routes.ts`)

Add two top-level routes (outside `AppLayout` — no nav, no context dependency):
```ts
{ path: 'share/:shareId', Component: SharePage },
{ path: 'embed/:shareId', Component: EmbedPage },
```

### Step 11 — Share Page (`src/app/pages/share.tsx`) NEW

1. `useParams` → `shareId`
2. Try `localStorage` first (own device), else `fetchMetaJson(shareId)` from Supabase
3. `getPdfAsync(shareId, meta.pdfUrl)` → `ArrayBuffer`
4. Render full `BookReader` with `pdfBuffer` prop (new optional prop that bypasses pdf-store lookup)
5. Loading/error states with branded AirBooks spinner

### Step 12 — Embed Page (`src/app/pages/embed.tsx`) NEW

Identical data loading to `SharePage`. Renders stripped-down reader:
- No nav bar, no close button
- Minimal header: title + page counter only
- `?page=N` query param support for deep-linking
- `width: 100%; height: 100vh` for iframe compatibility

---

## Data Flow

```
Upload PDF
  → add-book-modal → Supabase Storage → pdfUrl
  → storePdfPersistent → memory + IndexedDB
  → book.pdfUrl saved to localStorage

Read locally
  → getPdfAsync → memory hit (same session)
  → getPdfAsync → IndexedDB hit (next session, same device)

Share link clicked
  → uploadMetaJson → Supabase Storage → ${bookId}.meta.json

/share/:shareId opened (other device)
  → fetchMetaJson → { title, pdfUrl, totalPages, … }
  → getPdfAsync → fetch(pdfUrl) from Supabase CDN

/embed/:shareId in iframe
  → same data load → MinimalBookReader (no chrome)
```

---

## Supabase Bucket Setup (one-time)

- Bucket name: `airbooks-pdfs`
- Public: **yes** (anonymous GET allowed)
- RLS: allow `INSERT` for `anon` role (or use service role key for uploads if security is needed)
- Max file size: 50MB (Supabase free tier default)
- Env vars needed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## Critical Files

| File | Action |
|------|--------|
| `src/app/types.ts` | Extend `Book`, add `FlipTheme`/`ReaderTheme` |
| `src/app/pdf-store.ts` | Add IndexedDB, `getPdfAsync`, document cache |
| `src/app/supabase-client.ts` | NEW — Supabase upload/fetch helpers |
| `src/app/components/add-book-modal.tsx` | Supabase upload on submit |
| `src/app/components/app-layout.tsx` | Accept pre-generated id, call `storePdfPersistent` |
| `src/app/components/book-reader.tsx` | Theme system, enhanced animation, share button, PDF quality |
| `src/app/components/share-modal.tsx` | NEW — share link + embed code dialog |
| `src/app/themes/flip-themes.ts` | NEW — 4 flip theme configs |
| `src/app/themes/reader-themes.ts` | NEW — 4 reader theme configs |
| `src/app/routes.ts` | Add `/share/:shareId`, `/embed/:shareId` |
| `src/app/pages/share.tsx` | NEW — public reader page |
| `src/app/pages/embed.tsx` | NEW — minimal iframe reader |

---

## Verification

1. **Upload + share**: Add PDF book → check Supabase dashboard for `.pdf` and `.meta.json` files → copy share link → open in incognito → book loads from CDN
2. **Embed**: Copy embed code → paste into plain HTML file → open locally → reader renders in iframe
3. **IndexedDB**: Reload page → open PDF book → DevTools → Application → IndexedDB → `airbooks-pdfs` store should have the buffer
4. **Themes**: Open reader → cycle all 4 flip themes → verify background, shadow, ambient colors change → cycle reader themes → verify text and line colors change
5. **Animation quality**: Slow drag at mid-flip — skew curl visible; on retina screen, text in PDF crisp at 2× density
6. **Graceful degradation**: Remove Supabase env vars → books still add/read locally; share button shows "Configure Supabase" tooltip
