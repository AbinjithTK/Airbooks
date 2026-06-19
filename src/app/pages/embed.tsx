import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { fetchSharedBookMeta, SharedBookMeta } from '../supabase-books';
import { Book } from '../types';
import { getPdfAsync } from '../pdf-store';
import { BookReaderCore } from '../components/book-reader';

export function EmbedPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [searchParams] = useSearchParams();
  const [meta, setMeta] = useState<SharedBookMeta | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading…');

  // ?page=N for deep-linking — passed via state to reader
  const startPage = parseInt(searchParams.get('page') ?? '1', 10) || 1;

  useEffect(() => {
    if (!shareId) { setError('Invalid embed link.'); return; }

    (async () => {
      const bookMeta = await fetchSharedBookMeta(shareId);
      if (!bookMeta) {
        setError('Book not found or not publicly shared.');
        return;
      }
      setMeta(bookMeta);
      setStatus('Loading PDF…');

      try {
        const buf = await getPdfAsync(shareId, bookMeta.pdfUrl);
        if (!buf) throw new Error('Could not fetch PDF');
        setPdfBuffer(buf);
        setStatus('');
        pendo.track("embedded_book_viewed", {
          share_id: shareId,
          book_title: bookMeta.title,
          start_page: startPage,
          total_pages: bookMeta.totalPages,
        });
      } catch (e) {
        setError(`Failed to load PDF: ${e}`);
      }
    })();
  }, [shareId]);

  if (error) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFB' }}>
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <AlertCircle style={{ width: 32, height: 32, color: '#EF4444', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#64748B' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!meta || status) {
    return (
      <div style={{ width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFB' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#0F6FFF,#0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <BookOpen style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <Loader2 style={{ width: 20, height: 20, color: '#0F6FFF', margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 12, color: '#94A3B8' }}>{status}</p>
        </div>
      </div>
    );
  }

  const book: Book = {
    id: shareId!,
    title: meta.title,
    author: meta.author,
    coverColor: meta.coverColor,
    hasPdf: true,
    totalPdfPages: meta.totalPages,
    pages: meta.totalPages,
    addedDate: '',
    category: meta.category ?? '',
    pdfUrl: meta.pdfUrl,
    shareId,
    flipTheme: meta.flipTheme,
    readerTheme: meta.readerTheme,
  };

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <BookReaderCore
        book={book}
        pdfBuffer={pdfBuffer}
        hideClose
      />
    </div>
  );
}
