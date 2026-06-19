import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileText, CheckCircle2, ChevronRight, ChevronLeft,
  BookOpen, Palette, Sparkles, Eye, Loader2, AlertCircle, ArrowLeft, X,
} from 'lucide-react';
import { Book, SkyboxTheme } from '../types';
import { Book3DCanvas } from '../components/book-3d-canvas';
import { Icon3D } from '../components/ui/icon-3d';
import { skyboxThemes, skyboxThemeOrder } from '../themes/skybox-themes';
import { useWorld } from '../world/world-provider';
import { useAppContext } from '../components/app-layout';
import { storePdfPersistent } from '../pdf-store';
import { saveBook, uploadPdfToCloud } from '../supabase-books';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

const COLORS = [
  '#0F6FFF', '#0EA5E9', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#6366F1', '#14B8A6', '#F97316',
];
const CATEGORIES = ['Fiction', 'Non-Fiction', 'Science', 'Biography', 'Technology', 'Art', 'History', 'Philosophy'];

export function CreateBookPage() {
  const navigate = useNavigate();
  const { addBook } = useAppContext();
  const { setActiveSkybox } = useWorld();
  const [step, setStep] = useState(0); // 0=upload, 1=details, 2=theme, 3=preview

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Fiction');
  const [pages, setPages] = useState(200);
  const [coverColor, setCoverColor] = useState('#0F6FFF');
  const [skyboxTheme, setSkyboxThemeState] = useState<SkyboxTheme | undefined>(undefined);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const fileRef = useRef<HTMLInputElement>(null);

  const setSkyboxTheme = (t: SkyboxTheme | undefined) => {
    setSkyboxThemeState(t);
    setActiveSkybox(t ?? null);
  };

  const handleBack = () => { setActiveSkybox(null); navigate('/'); };

  const processPdf = async (file: File) => {
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      setPdfFile(file); setPdfArrayBuffer(buf); setPdfPageCount(pdf.numPages); setPages(pdf.numPages);
      const meta = await pdf.getMetadata().catch(() => null);
      if (meta?.info) {
        const info = meta.info as Record<string, string>;
        if (info.Title && !title) setTitle(info.Title);
        if (info.Author && !author) setAuthor(info.Author);
      }
    } catch { setError('Could not read PDF.'); } finally { setUploading(false); }
  };

  const handleCreate = async () => {
    setSaving(true); setError(null);
    const saved = await saveBook({ title, author, category, pages: pdfPageCount || pages, coverColor, hasPdf: false, totalPdfPages: pdfPageCount || undefined, skyboxTheme });
    if (!saved) { setSaving(false); setError('Could not save.'); return; }
    let final: Book = saved;
    if (pdfArrayBuffer) {
      await storePdfPersistent(saved.id, pdfArrayBuffer);
      const url = await uploadPdfToCloud(saved.id, pdfArrayBuffer);
      if (url) final = { ...saved, hasPdf: true, pdfUrl: url };
    }
    setSaving(false); addBook(final); setActiveSkybox(null); navigate('/');
  };

  const canNext = () => { if (step === 1 && (!title.trim() || !author.trim())) return false; return true; };

  return (
    <div className="fixed inset-0 z-30 bg-[#fafafa]">
      {/* ── Full-screen 3D Book Canvas ── */}
      <div className="absolute inset-0">
        <Book3DCanvas color={coverColor} title={title} author={author} category={category} step={step} interactive zoom={zoom} skyboxTheme={skyboxTheme} />
      </div>

      {/* ── Back Button (top-left, large) ── */}
      <motion.button
        onClick={handleBack}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-2xl font-medium text-sm text-gray-700 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md cursor-pointer hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Library
      </motion.button>

      {/* ── Step Content (bottom overlay — large floating panel, no sidebar) ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
        <motion.div
          layout
          className="max-w-2xl mx-auto rounded-3xl p-6 bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200/60"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && (
                <StepUpload {...{ pdfFile, pdfPageCount, uploading, dragOver, fileRef,
                  onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); },
                  onDragLeave: () => setDragOver(false),
                  onDrop: (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') processPdf(f); },
                  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processPdf(e.target.files[0]); },
                  onRemove: () => { setPdfFile(null); setPdfArrayBuffer(null); setPdfPageCount(0); },
                }} />
              )}
              {step === 1 && <StepDetails {...{ title, setTitle, author, setAuthor, category, setCategory, pages, setPages, pdfPageCount }} />}
              {step === 2 && <StepTheme {...{ coverColor, setCoverColor, skyboxTheme, setSkyboxTheme }} />}
              {step === 3 && <StepPreview title={title} author={author} category={category} pages={pdfPageCount || pages} coverColor={coverColor} skyboxTheme={skyboxTheme} hasPdf={!!pdfFile} />}
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl text-[12px] text-red-600 bg-red-50 border border-red-100">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* ── Navigation: Large game-style buttons ── */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            {/* Step dots */}
            <div className="flex items-center gap-2">
              {[0,1,2,3].map(i => (
                <button key={i} onClick={() => setStep(i)} className={`w-3 h-3 rounded-full cursor-pointer transition-all ${i === step ? 'bg-blue-500 scale-125' : i < step ? 'bg-blue-300' : 'bg-gray-200'}`} />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {step > 0 && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </motion.button>
              )}
              {step < 3 ? (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', boxShadow: '0 4px 14px -3px rgba(59,130,246,0.4)' }}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleCreate}
                  disabled={saving || !title.trim() || !author.trim()}
                  className="flex items-center gap-2 px-7 py-3 rounded-2xl font-semibold text-sm text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 14px -3px rgba(16,185,129,0.4)' }}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {saving ? 'Creating...' : 'Create Book'}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Zoom controls (left side, vertical) ── */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
        <ZoomBtn onClick={() => setZoom(z => Math.min(1.8, z + 0.15))} label="+" />
        <ZoomBtn onClick={() => setZoom(z => Math.max(0.6, z - 0.15))} label="−" />
        <ZoomBtn onClick={() => setZoom(1.0)} label="⟲" />
      </div>
    </div>
  );
}

/* ═══════ Sub-components ═══════ */

function ZoomBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <motion.button onClick={onClick} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
      className="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer text-gray-600 font-bold text-lg bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md hover:bg-white transition-colors"
    >{label}</motion.button>
  );
}

function StepUpload({ pdfFile, pdfPageCount, uploading, dragOver, fileRef, onDragOver, onDragLeave, onDrop, onFileChange, onRemove }: any) {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">Upload your PDF</h3>
      <p className="text-sm text-gray-500 mb-4">Or skip to create a blank book</p>
      <input ref={fileRef} type="file" accept=".pdf" onChange={onFileChange} className="hidden" />
      {!pdfFile ? (
        <label onClick={() => fileRef.current?.click()} onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          className="flex items-center gap-4 p-5 rounded-2xl cursor-pointer transition-all bg-gray-50 hover:bg-blue-50 hover:border-blue-300"
          style={{ border: dragOver ? '2px dashed #3B82F6' : '2px dashed #e5e7eb' }}>
          {uploading ? <Loader2 className="w-8 h-8 text-blue-500 animate-spin" /> : <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center"><Upload className="w-6 h-6 text-blue-600" /></div>}
          <div>
            <span className="text-sm font-semibold text-gray-900 block">{uploading ? 'Processing...' : 'Drop PDF here or tap to browse'}</span>
            <span className="text-xs text-gray-400">Up to 50MB</span>
          </div>
        </label>
      ) : (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-green-50 border border-green-200">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><FileText className="w-5 h-5 text-green-600" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{pdfFile.name}</p>
            <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{pdfPageCount} pages</p>
          </div>
          <button onClick={onRemove} className="p-2 rounded-xl hover:bg-green-100 text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

function StepDetails({ title, setTitle, author, setAuthor, category, setCategory, pages, setPages, pdfPageCount }: any) {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Book Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title..." className="w-full px-4 py-3 rounded-2xl text-sm text-gray-900 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Author *</label>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author name..." className="w-full px-4 py-3 rounded-2xl text-sm text-gray-900 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-2xl text-sm text-gray-900 bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pages</label>
          <input type="number" value={pdfPageCount || pages} onChange={(e) => setPages(Number(e.target.value))} disabled={pdfPageCount > 0} className="w-full px-4 py-3 rounded-2xl text-sm text-gray-900 bg-gray-50 border border-gray-200 focus:outline-none disabled:opacity-50" />
        </div>
      </div>
    </div>
  );
}

function StepTheme({ coverColor, setCoverColor, skyboxTheme, setSkyboxTheme }: any) {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Customize Look</h3>
      <div className="grid grid-cols-2 gap-6">
        {/* Cover color */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Cover Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(c => (
              <motion.button key={c} onClick={() => setCoverColor(c)} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                className="w-8 h-8 rounded-full cursor-pointer relative" style={{ background: c, boxShadow: coverColor === c ? `0 0 0 3px white, 0 0 0 5px ${c}` : '0 2px 6px -1px rgba(0,0,0,0.15)' }}>
                {coverColor === c && <div className="absolute inset-0 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-white drop-shadow" /></div>}
              </motion.button>
            ))}
          </div>
        </div>
        {/* Ambience */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Reading Ambience</label>
          <div className="grid grid-cols-4 gap-2">
            {skyboxThemeOrder.map(key => {
              const t = skyboxThemes[key]; const sel = skyboxTheme === key;
              const [top, mid, bot] = t.previewColors;
              return (
                <motion.button key={key} onClick={() => setSkyboxTheme(key)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 rounded-full cursor-pointer mx-auto" title={t.name}
                  style={{ background: `linear-gradient(145deg, ${top}, ${mid}, ${bot})`, boxShadow: sel ? `0 0 0 3px white, 0 0 0 5px ${t.accentColor}` : '0 2px 6px -1px rgba(0,0,0,0.15)' }} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepPreview({ title, author, category, pages, coverColor, skyboxTheme, hasPdf }: any) {
  const theme = skyboxTheme ? skyboxThemes[skyboxTheme] : null;
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Ready to Create!</h3>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Title" value={title || '—'} />
        <Stat label="Author" value={author || '—'} />
        <Stat label="Category" value={category} />
        <Stat label="Pages" value={String(pages)} />
        <Stat label="PDF" value={hasPdf ? '✓ Yes' : 'None'} />
        <Stat label="Ambience" value={theme ? `${theme.icon} ${theme.name}` : 'Default'} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{value}</p>
    </div>
  );
}
