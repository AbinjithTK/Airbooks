import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { PageFlip } from 'page-flip';
import { getPdfAsync, getOrLoadPdfDocument } from '../pdf-store';

export const PAGE_WIDTH = 380;
export const PAGE_HEIGHT = 540;

export interface FlipBookHandle {
  flipNext(): void;
  flipPrev(): void;
  getCurrentPageIndex(): number; // 0-based left page index
  getPageCount(): number;
}

interface FlipBookProps {
  bookId: string;
  pdfUrl?: string;
  totalPages: number;
  pdfAvailable: boolean;
  pageBackground: string;   // e.g. '#FDFBF7' — fills pages not yet rendered
  bookCoverColor?: string;   // tint for placeholder cover
  bookTitle?: string;
  onPageChange(leftPageIndex: number): void;
  onStateChange?(active: boolean): void;
}

/**
 * Production-quality page flip using StPageFlip (HTML mode).
 *
 * In HTML mode the page divs ARE the DOM — StPageFlip applies CSS clip/transform
 * to them but leaves the content as live HTML. That means setting img.src at any
 * time propagates immediately to the visible pages without any manual redraw call.
 * PDF pages are rendered lazily: the current spread + 3 neighbours are queued on
 * mount and after every page change.
 */
export const FlipBook = forwardRef<FlipBookHandle, FlipBookProps>(function FlipBook(
  { bookId, pdfUrl, totalPages, pdfAvailable, pageBackground, bookCoverColor,
    bookTitle, onPageChange, onStateChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pfRef = useRef<PageFlip | null>(null);
  const imgRefsRef = useRef<HTMLImageElement[]>([]);
  const renderingRef = useRef<Set<number>>(new Set());
  const renderedRef = useRef<Set<number>>(new Set());

  // Render one PDF page and inject its dataURL into the corresponding img element.
  // In StPageFlip's HTML mode the img element stays in the live DOM, so the
  // browser repaints it the moment img.src is set — no PageFlip.render() needed.
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfAvailable) return;
    if (pageNum < 1 || pageNum > totalPages) return;
    if (renderingRef.current.has(pageNum)) return;
    if (renderedRef.current.has(pageNum)) return;

    const img = imgRefsRef.current[pageNum - 1];
    if (!img) return;

    renderingRef.current.add(pageNum);
    try {
      const pdfData = await getPdfAsync(bookId, pdfUrl);
      if (!pdfData) return;
      const pdf = await getOrLoadPdfDocument(bookId, pdfData);
      if (pageNum > pdf.numPages) return;

      const page = await pdf.getPage(pageNum);
      const vp0 = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min(PAGE_WIDTH / vp0.width, PAGE_HEIGHT / vp0.height) * dpr;
      const vp = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = pageBackground;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp, intent: 'display' }).promise;

      // Write directly into the DOM — no PageFlip.update() needed in HTML mode.
      const target = imgRefsRef.current[pageNum - 1];
      if (target) {
        target.src = canvas.toDataURL('image/jpeg', 0.92);
        renderedRef.current.add(pageNum);
      }
    } catch {
      /* ignore individual page failures */
    } finally {
      renderingRef.current.delete(pageNum);
    }
  }, [bookId, pdfUrl, totalPages, pdfAvailable, pageBackground]);

  // Queue renders for the spread at `leftPageIndex` (0-based) plus neighbours.
  const renderAround = useCallback((leftPageIndex: number) => {
    const first1based = leftPageIndex + 1;
    // Current spread + one spread ahead + one spread behind
    [-2, -1, 0, 1, 2, 3, 4].forEach(d => renderPage(first1based + d));
  }, [renderPage]);

  // (Re-)initialize StPageFlip whenever totalPages changes.
  useEffect(() => {
    if (!containerRef.current) return;

    // Tear down any previous instance.
    pfRef.current?.destroy();
    pfRef.current = null;
    containerRef.current.innerHTML = '';
    imgRefsRef.current = [];
    renderingRef.current.clear();
    renderedRef.current.clear();

    const n = Math.max(2, totalPages); // StPageFlip needs ≥ 2 pages
    const pageEls: HTMLElement[] = [];

    for (let i = 0; i < n; i++) {
      const div = document.createElement('div');
      div.className = 'ab-flip-page';
      div.style.cssText = `background:${pageBackground};overflow:hidden;position:relative;`;

      // First and last pages behave as rigid covers.
      if (i === 0 || i === n - 1) {
        div.dataset.density = 'hard';
        // Colour the cover with the book's accent colour.
        div.style.background = bookCoverColor ?? '#0F6FFF';
        const label = document.createElement('div');
        label.style.cssText =
          'position:absolute;inset:0;display:flex;flex-direction:column;' +
          'align-items:center;justify-content:center;padding:24px;' +
          'color:rgba(255,255,255,0.85);text-align:center;font-family:Georgia,serif;';
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size:18px;font-weight:700;line-height:1.3;margin-bottom:8px;';
        titleEl.textContent = bookTitle ?? 'Book';
        label.appendChild(titleEl);
        div.appendChild(label);
      } else {
        // Interior pages: img element filled by our async renderer.
        const img = document.createElement('img');
        img.style.cssText =
          'display:block;width:100%;height:100%;object-fit:fill;';
        img.draggable = false;
        div.appendChild(img);
        imgRefsRef.current[i] = img;
      }

      containerRef.current.appendChild(div);
      pageEls.push(div);
    }

    const pf = new PageFlip(containerRef.current, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      size: 'fixed',
      drawShadow: true,
      flippingTime: 680,
      usePortrait: false,
      showCover: false,
      autoSize: false,
      maxShadowOpacity: 0.5,
      mobileScrollSupport: false,
      useMouseEvents: true,
      clickEventForward: false,
      swipeDistance: 25,
      startZIndex: 10,
    } as Parameters<typeof PageFlip.prototype.constructor>[1]);

    pf.loadFromHTML(pageEls);

    pf.on('flip', (e: unknown) => {
      const idx = (e as { data: number }).data;
      onPageChange(idx);
      renderAround(idx);
    });

    pf.on('changeState', (e: unknown) => {
      const s = (e as { data: string }).data;
      onStateChange?.(s !== 'read');
    });

    pf.on('init', () => {
      renderAround(0);
    });

    pfRef.current = pf;

    return () => {
      pf.destroy();
      pfRef.current = null;
    };
    // Re-init when the book itself changes; aesthetic changes (pageBackground)
    // don't need a full re-init — they only affect future unrendered pages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, bookId]);

  useImperativeHandle(ref, () => ({
    flipNext: () => pfRef.current?.flipNext(),
    flipPrev: () => pfRef.current?.flipPrev(),
    getCurrentPageIndex: () => pfRef.current?.getCurrentPageIndex() ?? 0,
    getPageCount: () => pfRef.current?.getPageCount() ?? 0,
  }), []);

  return (
    <div
      ref={containerRef}
      style={{ width: PAGE_WIDTH * 2, height: PAGE_HEIGHT, position: 'relative' }}
    />
  );
});
