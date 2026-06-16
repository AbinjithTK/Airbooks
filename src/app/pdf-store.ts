import * as pdfjsLib from 'pdfjs-dist';

// Layer 1: in-memory cache (fastest, lost on page refresh)
const memoryStore = new Map<string, ArrayBuffer>();

// Layer 2: IndexedDB (persists across refreshes, same origin)
const IDB_NAME = 'airbooks-pdfs';
const IDB_STORE = 'pdfs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(bookId: string): Promise<ArrayBuffer | undefined> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(bookId);
      req.onsuccess = () => resolve(req.result as ArrayBuffer | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch { return undefined; }
}

async function idbSet(bookId: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).put(data, bookId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) { console.log('IndexedDB write error:', e); }
}

async function idbDelete(bookId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).delete(bookId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* ignore */ }
}

// ─── Public API ───

/** Sync check (only checks memory layer) */
export function hasPdf(bookId: string): boolean {
  return memoryStore.has(bookId);
}

/** Sync write to memory only (legacy, used by existing callers) */
export function storePdf(bookId: string, data: ArrayBuffer): void {
  memoryStore.set(bookId, data);
}

/** Async write to memory + IndexedDB */
export async function storePdfPersistent(bookId: string, data: ArrayBuffer): Promise<void> {
  memoryStore.set(bookId, data);
  await idbSet(bookId, data);
}

/** Remove from all layers */
export async function removePdf(bookId: string): Promise<void> {
  memoryStore.delete(bookId);
  await idbDelete(bookId);
}

/**
 * Get PDF as ArrayBuffer:
 *   1. Memory (instant)
 *   2. IndexedDB (same device, persists across refreshes)
 *   3. Fetch from pdfUrl (Supabase CDN — cross-device sharing)
 */
export async function getPdfAsync(
  bookId: string,
  pdfUrl?: string,
): Promise<ArrayBuffer | undefined> {
  // Layer 1: memory
  if (memoryStore.has(bookId)) return memoryStore.get(bookId);

  // Layer 2: IndexedDB
  const idbData = await idbGet(bookId);
  if (idbData) {
    memoryStore.set(bookId, idbData); // promote to memory
    return idbData;
  }

  // Layer 3: fetch from Supabase CDN
  if (pdfUrl) {
    try {
      const res = await fetch(pdfUrl);
      if (res.ok) {
        const data = await res.arrayBuffer();
        memoryStore.set(bookId, data);
        await idbSet(bookId, data); // cache locally for next time
        return data;
      }
    } catch (e) { console.log('PDF fetch error:', e); }
  }

  return undefined;
}

/** Sync get (memory only, for legacy callers) */
export function getPdf(bookId: string): ArrayBuffer | undefined {
  return memoryStore.get(bookId);
}

// ─── PDF Document Cache ───
// Avoids re-parsing the same PDF multiple times per render cycle

const docCache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>();

export function getOrLoadPdfDocument(
  bookId: string,
  buffer: ArrayBuffer,
): Promise<pdfjsLib.PDFDocumentProxy> {
  if (!docCache.has(bookId)) {
    docCache.set(
      bookId,
      pdfjsLib.getDocument({ data: buffer.slice(0) }).promise,
    );
  }
  return docCache.get(bookId)!;
}

export function evictPdfDocument(bookId: string): void {
  docCache.delete(bookId);
}
