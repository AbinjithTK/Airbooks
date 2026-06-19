import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getSupabaseClient } from '/utils/supabase/client';
import { Book, FlipTheme, ReaderTheme } from './types';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-78e76d1f`;

export interface SharedBookMeta {
  title: string;
  author: string;
  coverColor: string;
  totalPages: number;
  pdfUrl: string;
  category?: string;
  flipTheme?: FlipTheme;
  readerTheme?: ReaderTheme;
}

/** Resolve the current user's access token (falls back to the anon key). */
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await getSupabaseClient().auth.getSession();
  const token = data.session?.access_token ?? publicAnonKey;
  return { Authorization: `Bearer ${token}` };
}

// ─── Library CRUD (authenticated) ───

/** Fetch the signed-in user's library from the server. */
export async function listBooks(): Promise<Book[]> {
  // Dev bypass: return sample books so the UI is visible locally
  if (import.meta.env.DEV && window.location.search.includes('dev=true')) {
    return DEV_SAMPLE_BOOKS;
  }
  try {
    const res = await fetch(`${SERVER}/books`, { headers: await authHeader() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.log('List books failed:', err);
      return [];
    }
    const { books } = await res.json();
    return books ?? [];
  } catch (e) {
    console.log('List books error:', e);
    return [];
  }
}

/** Create or update a book's metadata. Returns the saved book (with id). */
export async function saveBook(book: Partial<Book>): Promise<Book | null> {
  try {
    const res = await fetch(`${SERVER}/books`, {
      method: 'POST',
      headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.log('Save book failed:', err);
      return null;
    }
    const { book: saved } = await res.json();
    return saved ?? null;
  } catch (e) {
    console.log('Save book error:', e);
    return null;
  }
}

/** Delete a book (and its PDF + share record) from the server. */
export async function deleteBook(bookId: string): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER}/books/${bookId}`, {
      method: 'DELETE',
      headers: await authHeader(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.log('Delete book failed:', err);
      return false;
    }
    return true;
  } catch (e) {
    console.log('Delete book error:', e);
    return false;
  }
}

/** Upload PDF bytes to the user's private storage. Returns a signed URL or null. */
export async function uploadPdfToCloud(
  bookId: string,
  buffer: ArrayBuffer,
): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('pdf', new Blob([buffer], { type: 'application/pdf' }), `${bookId}.pdf`);
    const res = await fetch(`${SERVER}/books/${bookId}/pdf`, {
      method: 'POST',
      headers: await authHeader(),
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.log('PDF cloud upload failed:', err);
      return null;
    }
    const { pdfUrl } = await res.json();
    return pdfUrl ?? null;
  } catch (e) {
    console.log('PDF cloud upload error:', e);
    return null;
  }
}

// ─── Sharing ───

/** Publish a book publicly. Returns the shareId, or null on failure. */
export async function shareBook(bookId: string): Promise<string | null> {
  try {
    const res = await fetch(`${SERVER}/books/${bookId}/share`, {
      method: 'POST',
      headers: await authHeader(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.log('Share publish failed:', err);
      return null;
    }
    const { shareId } = await res.json();
    return shareId ?? null;
  } catch (e) {
    console.log('Share publish error:', e);
    return null;
  }
}

/** Remove a public share. */
export async function unshareBook(bookId: string): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER}/books/${bookId}/share`, {
      method: 'DELETE',
      headers: await authHeader(),
    });
    return res.ok;
  } catch (e) {
    console.log('Unshare error:', e);
    return false;
  }
}

/** Fetch a public share's metadata (no auth required). */
export async function fetchSharedBookMeta(shareId: string): Promise<SharedBookMeta | null> {
  try {
    const res = await fetch(`${SERVER}/share/${shareId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });
    if (!res.ok) return null;
    const { meta } = await res.json();
    return meta ?? null;
  } catch (e) {
    console.log('Share meta fetch error:', e);
    return null;
  }
}

// ─── Link builders ───

export function buildShareUrl(shareId: string): string {
  return `${window.location.origin}/share/${shareId}`;
}

export function buildEmbedCode(shareId: string): string {
  const url = `${window.location.origin}/embed/${shareId}`;
  return `<iframe src="${url}" width="900" height="620" frameborder="0" allow="fullscreen" style="border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.18);"></iframe>`;
}

/** A book is shareable once it has a published shareId (or a cloud PDF). */
export function isShareable(book: Book): boolean {
  return !!book.shareId || !!book.pdfUrl;
}


// ─── Dev sample books (only used when ?dev=true on localhost) ───
const DEV_SAMPLE_BOOKS: Book[] = [
  {
    id: 'dev-1',
    title: 'The Art of Clean Code',
    author: 'Robert C. Martin',
    coverColor: '#0F6FFF',
    hasPdf: false,
    pages: 320,
    addedDate: '2025-03-15',
    category: 'Technology',
  },
  {
    id: 'dev-2',
    title: 'Dune',
    author: 'Frank Herbert',
    coverColor: '#F59E0B',
    hasPdf: true,
    totalPdfPages: 412,
    pages: 412,
    addedDate: '2025-02-20',
    category: 'Fiction',
    skyboxTheme: 'sunset',
  },
  {
    id: 'dev-3',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    coverColor: '#10B981',
    hasPdf: false,
    pages: 498,
    addedDate: '2025-01-10',
    category: 'History',
    skyboxTheme: 'forest',
  },
  {
    id: 'dev-4',
    title: 'Deep Work',
    author: 'Cal Newport',
    coverColor: '#8B5CF6',
    hasPdf: true,
    totalPdfPages: 284,
    pages: 284,
    addedDate: '2025-04-01',
    category: 'Non-Fiction',
    skyboxTheme: 'library',
  },
  {
    id: 'dev-5',
    title: 'The Ocean at the End of the Lane',
    author: 'Neil Gaiman',
    coverColor: '#0EA5E9',
    hasPdf: false,
    pages: 181,
    addedDate: '2025-05-12',
    category: 'Fiction',
    skyboxTheme: 'ocean',
  },
  {
    id: 'dev-6',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    coverColor: '#6366F1',
    hasPdf: false,
    pages: 256,
    addedDate: '2024-12-08',
    category: 'Philosophy',
    skyboxTheme: 'night-sky',
  },
];
