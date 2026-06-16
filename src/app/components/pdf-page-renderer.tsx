import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getPdf } from '../pdf-store';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PdfPageRendererProps {
  bookId: string;
  pageNumber: number; // 1-indexed
  width?: number;
  height?: number;
  className?: string;
}

export function PdfPageRenderer({ bookId, pageNumber, width = 380, height = 560, className = '' }: PdfPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPage() {
      const pdfData = getPdf(bookId);
      if (!pdfData) {
        setError('PDF not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const pdf = await pdfjsLib.getDocument({ data: pdfData.slice(0) }).promise;

        if (pageNumber > pdf.numPages || pageNumber < 1) {
          setError(`Page ${pageNumber} not available`);
          setLoading(false);
          return;
        }

        const page = await pdf.getPage(pageNumber);

        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Calculate scale to fit desired width/height
        const viewport = page.getViewport({ scale: 1 });
        const scaleX = width / viewport.width;
        const scaleY = height / viewport.height;
        const scale = Math.min(scaleX, scaleY);
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // White background
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to render page');
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [bookId, pageNumber, width, height]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#0F6FFF]/30 border-t-[#0F6FFF] rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-[#94A3B8] italic">{error}</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`max-w-full max-h-full mx-auto ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      />
    </div>
  );
}
