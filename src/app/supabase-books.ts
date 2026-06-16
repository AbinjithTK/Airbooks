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
