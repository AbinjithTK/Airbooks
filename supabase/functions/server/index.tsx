import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const PREFIX = "/make-server-78e76d1f";
const BUCKET = "airbooks-pdfs-78e76d1f";
// Signed URLs are regenerated on every read, so a long-ish expiry is fine.
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// ─── Storage bucket bootstrap ───
async function ensureBucket() {
  const supabase = admin();
  const { data: buckets } = await supabase.storage.listBuckets();
  const existing = buckets?.find((b) => b.name === BUCKET);
  if (!existing) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (error) console.log("Bucket creation error:", error.message);
    else console.log("Created private bucket:", BUCKET);
  } else if (existing.public) {
    // Lock down a previously-public bucket; PDFs are served via signed URLs only.
    const { error } = await supabase.storage.updateBucket(BUCKET, { public: false });
    if (error) console.log("Bucket lockdown error:", error.message);
  }
}
ensureBucket();

// ─── Records stored in KV ───
// book:{userId}:{bookId} -> StoredBook (owner's library)
// share:{shareId}        -> { ownerId, bookId, ...meta, storagePath }

interface StoredBook {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  category: string;
  pages: number;
  hasPdf: boolean;
  totalPdfPages?: number;
  storagePath?: string;
  shareId?: string;
  flipTheme?: string;
  readerTheme?: string;
  addedDate: string;
}

// ─── Auth helper ───
async function getUserId(c: any): Promise<string | null> {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

async function signedPdfUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await admin()
    .storage.from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (error) {
    console.log("Signed URL error for", storagePath, ":", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

// Attach a fresh signed pdfUrl to an outgoing book record (and strip storagePath).
async function withPdfUrl(book: StoredBook) {
  let pdfUrl: string | undefined;
  if (book.hasPdf && book.storagePath) {
    pdfUrl = (await signedPdfUrl(book.storagePath)) ?? undefined;
  }
  const { storagePath: _omit, ...rest } = book;
  return { ...rest, pdfUrl };
}

// ─── Health ───
app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok" }));

// ─── Auth: email/password sign up ───
// (Google OAuth users are created automatically by Supabase and skip this.)
app.post(`${PREFIX}/signup`, async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required." }, 400);
    }
    const { data, error } = await admin().auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name ?? "" },
      // Auto-confirm: no email server is configured in this environment.
      email_confirm: true,
    });
    if (error) {
      console.log("Signup error:", error.message);
      return c.json({ error: error.message }, 400);
    }
    return c.json({ user: { id: data.user.id, email: data.user.email } });
  } catch (err) {
    console.log("Unexpected signup error:", err);
    return c.json({ error: `Server error during signup: ${err}` }, 500);
  }
});

// ─── Profile ───
app.get(`${PREFIX}/me`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const { data } = await admin().auth.admin.getUserById(userId);
    const meta = (data?.user?.user_metadata ?? {}) as Record<string, string>;
    const books = (await kv.getByPrefix(`book:${userId}:`)) as StoredBook[];
    return c.json({
      profile: {
        id: userId,
        email: data?.user?.email ?? "",
        name: meta.name || meta.full_name || (data?.user?.email ?? "").split("@")[0] || "",
        bookCount: books.length,
      },
    });
  } catch (err) {
    console.log("Profile fetch error:", err);
    return c.json({ error: `Server error fetching profile: ${err}` }, 500);
  }
});

// ─── List the current user's library ───
app.get(`${PREFIX}/books`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const books = (await kv.getByPrefix(`book:${userId}:`)) as StoredBook[];
    const withUrls = await Promise.all(books.map(withPdfUrl));
    withUrls.sort((a, b) => (a.addedDate < b.addedDate ? 1 : -1));
    return c.json({ books: withUrls });
  } catch (err) {
    console.log("List books error:", err);
    return c.json({ error: `Server error listing books: ${err}` }, 500);
  }
});

// ─── Create / update a book ───
app.post(`${PREFIX}/books`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const body = await c.req.json();
    const id: string = body.id ?? Date.now().toString();
    const key = `book:${userId}:${id}`;
    const existing = (await kv.get(key)) as StoredBook | null;

    const book: StoredBook = {
      id,
      title: body.title ?? existing?.title ?? "Untitled",
      author: body.author ?? existing?.author ?? "Unknown",
      coverColor: body.coverColor ?? existing?.coverColor ?? "#0F6FFF",
      category: body.category ?? existing?.category ?? "Fiction",
      pages: body.pages ?? existing?.pages ?? 0,
      hasPdf: body.hasPdf ?? existing?.hasPdf ?? false,
      totalPdfPages: body.totalPdfPages ?? existing?.totalPdfPages,
      storagePath: existing?.storagePath,
      shareId: existing?.shareId,
      flipTheme: body.flipTheme ?? existing?.flipTheme,
      readerTheme: body.readerTheme ?? existing?.readerTheme,
      addedDate: existing?.addedDate ?? new Date().toISOString(),
    };
    await kv.set(key, book);
    return c.json({ book: await withPdfUrl(book) });
  } catch (err) {
    console.log("Create book error:", err);
    return c.json({ error: `Server error saving book: ${err}` }, 500);
  }
});

// ─── Delete a book (+ its PDF + any share record) ───
app.delete(`${PREFIX}/books/:id`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  try {
    const key = `book:${userId}:${id}`;
    const book = (await kv.get(key)) as StoredBook | null;
    if (book?.storagePath) {
      await admin().storage.from(BUCKET).remove([book.storagePath]);
    }
    if (book?.shareId) {
      await kv.del(`share:${book.shareId}`);
    }
    await kv.del(key);
    return c.json({ ok: true });
  } catch (err) {
    console.log("Delete book error:", err);
    return c.json({ error: `Server error deleting book: ${err}` }, 500);
  }
});

// ─── Upload a book's PDF (multipart) ───
app.post(`${PREFIX}/books/:id/pdf`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  try {
    const form = await c.req.formData();
    const file = form.get("pdf") as File | null;
    if (!file) return c.json({ error: "No PDF file provided." }, 400);

    const storagePath = `${userId}/${id}.pdf`;
    const buffer = await file.arrayBuffer();
    const { error } = await admin().storage.from(BUCKET).upload(
      storagePath,
      buffer,
      { contentType: "application/pdf", upsert: true },
    );
    if (error) {
      console.log(`PDF upload error for ${id}:`, error.message);
      return c.json({ error: `Upload failed: ${error.message}` }, 500);
    }

    // Persist storage path on the book record.
    const key = `book:${userId}:${id}`;
    const book = (await kv.get(key)) as StoredBook | null;
    if (book) {
      book.hasPdf = true;
      book.storagePath = storagePath;
      await kv.set(key, book);
      // Keep any existing share record in sync.
      if (book.shareId) {
        const share = (await kv.get(`share:${book.shareId}`)) as any;
        if (share) {
          share.storagePath = storagePath;
          await kv.set(`share:${book.shareId}`, share);
        }
      }
    }

    const pdfUrl = await signedPdfUrl(storagePath);
    return c.json({ pdfUrl });
  } catch (err) {
    console.log(`Unexpected PDF upload error for ${id}:`, err);
    return c.json({ error: `Server error uploading PDF: ${err}` }, 500);
  }
});

// ─── Publish a book as a public share ───
app.post(`${PREFIX}/books/:id/share`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  try {
    const key = `book:${userId}:${id}`;
    const book = (await kv.get(key)) as StoredBook | null;
    if (!book) return c.json({ error: "Book not found." }, 404);
    if (!book.hasPdf || !book.storagePath) {
      return c.json({ error: "Book has no PDF to share." }, 400);
    }

    const shareId = book.shareId ?? id;
    const share = {
      shareId,
      ownerId: userId,
      bookId: id,
      title: book.title,
      author: book.author,
      coverColor: book.coverColor,
      category: book.category,
      totalPages: book.totalPdfPages ?? book.pages,
      flipTheme: book.flipTheme,
      readerTheme: book.readerTheme,
      storagePath: book.storagePath,
    };
    await kv.set(`share:${shareId}`, share);

    book.shareId = shareId;
    await kv.set(key, book);

    return c.json({ shareId });
  } catch (err) {
    console.log("Share publish error:", err);
    return c.json({ error: `Server error publishing share: ${err}` }, 500);
  }
});

// ─── Unpublish a share ───
app.delete(`${PREFIX}/books/:id/share`, async (c) => {
  const userId = await getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  try {
    const key = `book:${userId}:${id}`;
    const book = (await kv.get(key)) as StoredBook | null;
    if (book?.shareId) {
      await kv.del(`share:${book.shareId}`);
      book.shareId = undefined;
      await kv.set(key, book);
    }
    return c.json({ ok: true });
  } catch (err) {
    console.log("Unshare error:", err);
    return c.json({ error: `Server error unpublishing share: ${err}` }, 500);
  }
});

// ─── Public: resolve a share (no auth) ───
app.get(`${PREFIX}/share/:shareId`, async (c) => {
  const shareId = c.req.param("shareId");
  try {
    const share = (await kv.get(`share:${shareId}`)) as any;
    if (!share) return c.json({ error: "Share not found." }, 404);
    const pdfUrl = share.storagePath ? await signedPdfUrl(share.storagePath) : null;
    if (!pdfUrl) return c.json({ error: "Shared PDF is unavailable." }, 404);
    return c.json({
      meta: {
        title: share.title,
        author: share.author,
        coverColor: share.coverColor,
        category: share.category,
        totalPages: share.totalPages,
        flipTheme: share.flipTheme,
        readerTheme: share.readerTheme,
        pdfUrl,
      },
    });
  } catch (err) {
    console.log("Share resolve error:", err);
    return c.json({ error: `Server error resolving share: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);
