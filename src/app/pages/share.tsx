import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { fetchSharedBookMeta, SharedBookMeta } from '../supabase-books';
import { BookReaderCore } from '../components/book-reader';
import { Book } from '../types';

export function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [meta, setMeta] = useState<SharedBookMeta | null>(null);
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading book info…');

  useEffect(() => {
    if (!shareId) { setError('Invalid share link.'); return; }

    (async () => {
      // Resolve the public share record from the server.
      setStatus('Fetching book metadata…');
      const bookMeta = await fetchSharedBookMeta(shareId);
      if (!bookMeta) {
        setError('Book not found. The share link may have expired or the book is no longer shared.');
        return;
      }
      setMeta(bookMeta);

      // Fetch the PDF from the signed URL.
      setStatus('Loading PDF…');
      try {
        const res = await fetch(bookMeta.pdfUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        setPdfBuffer(buf);
        setStatus('');
        pendo.track("shared_book_viewed", {
          share_id: shareId,
          book_title: bookMeta.title,
          book_author: bookMeta.author,
          total_pages: bookMeta.totalPages,
        });
      } catch (e) {
        setError(`Failed to load PDF: ${e}`);
      }
    })();
  }, [shareId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8FAFB] to-[#E8F2FF]">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-[#1A2332] mb-2">Book unavailable</h2>
          <p className="text-sm text-[#64748B]">{error}</p>
        </div>
      </div>
    );
  }

  if (!meta || status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8FAFB] to-[#E8F2FF]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 text-[#0F6FFF] animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">{status || 'Loading…'}</p>
        </div>
      </div>
    );
  }

  // Build a minimal Book object for BookReaderCore
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
    shareId: shareId,
    flipTheme: meta.flipTheme,
    readerTheme: meta.readerTheme,
  };

  return (
    <BookReaderCore
      book={book}
      pdfBuffer={pdfBuffer}
    />
  );
}
