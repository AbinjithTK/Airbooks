import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileText, CheckCircle2, X, ChevronRight, ChevronLeft,
  BookOpen, Palette, Sparkles, Eye, Loader2, Cloud, AlertCircle,
} from 'lucide-react';
import { Book, SkyboxTheme } from '../types';
import { Book3DPreview } from './book-3d-preview';
import { Book3DCanvas } from './book-3d-canvas';
import { Icon3D } from './ui/icon-3d';
import { Button3D } from './ui/button-3d';
import { skyboxThemes, skyboxThemeOrder } from '../themes/skybox-themes';
import { useWorld } from '../world/world-provider';
import { storePdfPersistent } from '../pdf-store';
import { saveBook, uploadPdfToCloud } from '../supabase-books';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface BookCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (book: Book) => void;
}

const STEPS = [
  { id: 'upload', label: 'Upload', icon: Upload, color: 'blue' as const },
  { id: 'details', label: 'Details', icon: BookOpen, color: 'amber' as const },
  { id: 'theme', label: 'Theme', icon: Palette, color: 'purple' as const },
  { id: 'preview', label: 'Preview', icon: Eye, color: 'green' as const },
];

const COLORS = [
  '#0F6FFF', '#0EA5E9', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#6366F1', '#14B8A6', '#F97316',
];

const CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Science', 'Biography',
  'Technology', 'Art', 'History', 'Philosophy',
];

export function BookCreator({ isOpen, onClose, onCreated }: BookCreatorProps) {
  const [step, setStep] = useState(0);
  const { setActiveSkybox } = useWorld();

  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Fiction');
  const [pages, setPages] = useState(200);
  const [coverColor, setCoverColor] = useState('#0F6FFF');
  const [skyboxTheme, setSkyboxThemeState] = useState<SkyboxTheme | undefined>(undefined);
  const setSkyboxTheme = (t: SkyboxTheme | undefined) => {
    setSkyboxThemeState(t);
    setActiveSkybox(t ?? null);
  };
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(0);
    setTitle(''); setAuthor(''); setCategory('Fiction');
    setPages(200); setCoverColor('#0F6FFF'); setSkyboxTheme(undefined);
    setPdfFile(null); setPdfArrayBuffer(null); setPdfPageCount(0);
    setUploading(false); setSaving(false); setError(null); setDragOver(false);
    setZoom(1.0);
  };

  const handleClose = () => { reset(); setActiveSkybox(null); onClose(); };

  const processPdf = async (file: File) => {
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
      setPdfFile(file);
      setPdfArrayBuffer(buf);
      setPdfPageCount(pdf.numPages);
      setPages(pdf.numPages);
      const meta = await pdf.getMetadata().catch(() => null);
      if (meta?.info) {
        const info = meta.info as Record<string, string>;
        if (info.Title && !title) setTitle(info.Title);
        if (info.Author && !author) setAuthor(info.Author);
      }
    } catch {
      setError('Could not read this PDF. Try another file.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === 'application/pdf') processPdf(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processPdf(e.target.files[0]);
  };

  const canAdvance = () => {
    if (step === 1 && (!title.trim() || !author.trim())) return false;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true); setError(null);
    const saved = await saveBook({
      title, author, category,
      pages: pdfPageCount || pages,
      coverColor, hasPdf: false,
      totalPdfPages: pdfPageCount || undefined,
      skyboxTheme,
    });
    if (!saved) {
      setSaving(false);
      setError('Could not save. Check your connection.');
      return;
    }
    let final: Book = saved;
    if (pdfArrayBuffer) {
      await storePdfPersistent(saved.id, pdfArrayBuffer);
      const url = await uploadPdfToCloud(saved.id, pdfArrayBuffer);
      if (url) final = { ...saved, hasPdf: true, pdfUrl: url };
    }
    setSaving(false);
    pendo.track("book_created_modal", {
      has_pdf: !!pdfArrayBuffer,
      category,
      cover_color: coverColor,
      page_count: pdfPageCount || pages,
      has_skybox_theme: !!skyboxTheme,
      skybox_theme: skyboxTheme || "none",
      creation_method: "modal",
    });
    onCreated(final);
    reset();
    setActiveSkybox(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — translucent so 3D world shows through */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50"
            style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(10,5,2,0.7), rgba(0,0,0,0.82))' }}
          />

          {/* Creator panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex rounded-3xl"
              style={{
                background: 'linear-gradient(145deg, rgba(35,22,10,0.93), rgba(20,12,5,0.95))',
                boxShadow: '0 30px 80px -12px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,200,100,0.05)',
                border: '1px solid rgba(255,200,100,0.06)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* ─── Left: 3D Preview ─── */}
              <div className="flex-1 min-w-0 relative flex flex-col">
                {/* 3D Book preview area */}
                <div className="flex-1 relative">
                  <Book3DCanvas
                    color={coverColor}
                    title={title}
                    author={author}
                    category={category}
                    step={step}
                    interactive={true}
                    zoom={zoom}
                  />

                  {/* Zoom buttons (3D orb style) */}
                  <div className="absolute bottom-6 left-6 flex gap-2">
                    <Orb3DButton
                      onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
                      label="+"
                    />
                    <Orb3DButton
                      onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
                      label="−"
                    />
                    <Orb3DButton
                      onClick={() => setZoom(1.0)}
                      label="⟲"
                    />
                  </div>
                </div>

                {/* Step indicator (bottom) */}
                <div className="px-6 pb-5 pt-3 flex items-center justify-center gap-2">
                  {STEPS.map((s, i) => (
                    <motion.button
                      key={s.id}
                      onClick={() => setStep(i)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                      style={{
                        background: i === step
                          ? 'rgba(255,200,100,0.1)'
                          : 'transparent',
                        border: i === step
                          ? '1px solid rgba(255,200,100,0.15)'
                          : '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{
                          background: i <= step
                            ? 'linear-gradient(145deg, #F59E0B, #D97706)'
                            : 'rgba(255,255,255,0.06)',
                          boxShadow: i <= step
                            ? '0 2px 8px -2px rgba(245,158,11,0.4), inset 0 1px 1px rgba(255,255,255,0.2)'
                            : 'none',
                        }}
                      >
                        {i < step ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <s.icon className="w-3 h-3 text-white/80" />
                        )}
                      </div>
                      <span className={`text-[11px] font-medium ${i === step ? 'text-amber-100/80' : 'text-white/30'}`}>
                        {s.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* ─── Right: Step Content ─── */}
              <div className="w-[380px] flex-shrink-0 flex flex-col border-l border-white/5">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <div className="flex items-center gap-3">
                    <Icon3D color={STEPS[step].color} size="sm">
                      {(() => { const I = STEPS[step].icon; return <I className="w-4 h-4" />; })()}
                    </Icon3D>
                    <h2 className="text-base font-bold text-amber-50/90">
                      {STEPS[step].label}
                    </h2>
                  </div>
                  <motion.button
                    onClick={handleClose}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-xl text-white/30 hover:text-white/70 cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Step content (animated) */}
                <div className="flex-1 overflow-y-auto px-6 pb-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    >
                      {step === 0 && (
                        <StepUpload
                          pdfFile={pdfFile}
                          pdfPageCount={pdfPageCount}
                          uploading={uploading}
                          dragOver={dragOver}
                          fileRef={fileRef}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleDrop}
                          onFileChange={handleFileChange}
                          onRemove={() => { setPdfFile(null); setPdfArrayBuffer(null); setPdfPageCount(0); }}
                        />
                      )}
                      {step === 1 && (
                        <StepDetails
                          title={title} setTitle={setTitle}
                          author={author} setAuthor={setAuthor}
                          category={category} setCategory={setCategory}
                          pages={pages} setPages={setPages}
                          pdfPageCount={pdfPageCount}
                        />
                      )}
                      {step === 2 && (
                        <StepTheme
                          coverColor={coverColor} setCoverColor={setCoverColor}
                          skyboxTheme={skyboxTheme} setSkyboxTheme={setSkyboxTheme}
                        />
                      )}
                      {step === 3 && (
                        <StepPreview
                          title={title} author={author} category={category}
                          pages={pdfPageCount || pages} coverColor={coverColor}
                          skyboxTheme={skyboxTheme} hasPdf={!!pdfFile}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Error */}
                {error && (
                  <div className="mx-6 mb-3 flex items-start gap-2 p-3 rounded-xl text-[12px] text-red-300"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)' }}
                  >
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between px-6 pb-5 pt-2 border-t border-white/5">
                  {step > 0 ? (
                    <Button3D variant="ghost" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => setStep(s => s - 1)}>
                      Back
                    </Button3D>
                  ) : <div />}

                  {step < 3 ? (
                    <Button3D
                      variant="primary"
                      size="sm"
                      icon={<ChevronRight className="w-4 h-4" />}
                      onClick={() => setStep(s => s + 1)}
                      disabled={!canAdvance()}
                    >
                      Next
                    </Button3D>
                  ) : (
                    <Button3D
                      variant="primary"
                      size="md"
                      icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      onClick={handleCreate}
                      disabled={saving || !title.trim() || !author.trim()}
                    >
                      {saving ? 'Creating...' : 'Create Book'}
                    </Button3D>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════
   Step Components
   ═══════════════════════════════════════════════════ */

function StepUpload({ pdfFile, pdfPageCount, uploading, dragOver, fileRef, onDragOver, onDragLeave, onDrop, onFileChange, onRemove }: any) {
  return (
    <div className="space-y-4 pt-2">
      <p className="text-[12px] text-amber-200/40 leading-relaxed">
        Upload a PDF to read in your immersive library. Or skip this step to create a placeholder book.
      </p>
      <input ref={fileRef} type="file" accept=".pdf" onChange={onFileChange} className="hidden" />

      {!pdfFile ? (
        <label
          htmlFor=""
          onClick={() => fileRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className="flex flex-col items-center justify-center w-full px-5 py-10 rounded-2xl cursor-pointer transition-all"
          style={{
            background: dragOver ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.02)',
            border: dragOver ? '2px dashed rgba(245,158,11,0.4)' : '2px dashed rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-amber-200/50 animate-spin mb-3" />
          ) : (
            <Icon3D color="amber" size="lg" className="mb-4">
              <Upload className="w-6 h-6" />
            </Icon3D>
          )}
          <span className="text-sm font-medium text-amber-100/60">
            {uploading ? 'Processing...' : 'Drop PDF here or tap to browse'}
          </span>
          <span className="text-[10px] text-white/25 mt-1">Up to 50MB</span>
        </label>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
        >
          <Icon3D color="green" size="md">
            <FileText className="w-5 h-5" />
          </Icon3D>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-amber-50/80 truncate">{pdfFile.name}</p>
            <p className="text-[10px] text-green-300/60 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" />
              {pdfPageCount} pages &bull; {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <Orb3DButton onClick={onRemove} label="✕" small />
        </div>
      )}
    </div>
  );
}

function StepDetails({ title, setTitle, author, setAuthor, category, setCategory, pages, setPages, pdfPageCount }: any) {
  return (
    <div className="space-y-5 pt-2">
      <InsetField label="Title" value={title} onChange={setTitle} placeholder="Book title..." required />
      <InsetField label="Author" value={author} onChange={setAuthor} placeholder="Author name..." required />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-amber-200/50 uppercase tracking-wider mb-2">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-[12px] font-medium text-amber-50/80 bg-transparent focus:outline-none cursor-pointer"
            style={{
              background: 'linear-gradient(to bottom, rgba(15,8,2,0.5), rgba(25,15,5,0.3))',
              boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.25), 0 1px 0 rgba(255,200,100,0.03)',
              border: '1px solid rgba(255,200,100,0.06)',
            }}
          >
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#1a0e06] text-white">{c}</option>)}
          </select>
        </div>
        <InsetField
          label="Pages"
          type="number"
          value={String(pdfPageCount || pages)}
          onChange={(v: string) => setPages(Number(v))}
          disabled={pdfPageCount > 0}
        />
      </div>
    </div>
  );
}

function StepTheme({ coverColor, setCoverColor, skyboxTheme, setSkyboxTheme }: any) {
  return (
    <div className="space-y-6 pt-2">
      {/* Cover color */}
      <div>
        <label className="block text-[11px] font-semibold text-amber-200/50 uppercase tracking-wider mb-3">Cover Color</label>
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map(c => (
            <motion.button
              key={c}
              type="button"
              onClick={() => setCoverColor(c)}
              whileHover={{ scale: 1.15, y: -3 }}
              whileTap={{ scale: 0.9 }}
              className="w-9 h-9 rounded-full cursor-pointer relative"
              style={{
                background: `linear-gradient(145deg, ${adjustB(c, 15)}, ${c}, ${adjustB(c, -25)})`,
                boxShadow: coverColor === c
                  ? `0 0 0 3px ${c}, 0 4px 12px -2px ${c}60, inset 0 1px 2px rgba(255,255,255,0.3)`
                  : `0 3px 8px -2px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.2)`,
                border: coverColor === c ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {coverColor === c && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-4 h-4 rounded-full bg-white/90 flex items-center justify-center shadow">
                    <CheckCircle2 className="w-2.5 h-2.5 text-gray-800" />
                  </div>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Skybox */}
      <div>
        <label className="block text-[11px] font-semibold text-amber-200/50 uppercase tracking-wider mb-3">Reading Ambience</label>
        <div className="grid grid-cols-4 gap-2.5">
          {skyboxThemeOrder.map(key => {
            const t = skyboxThemes[key];
            const sel = skyboxTheme === key;
            const [top, mid, bot] = t.previewColors;
            return (
              <motion.button
                key={key}
                type="button"
                onClick={() => setSkyboxTheme(key)}
                whileHover={{ scale: 1.1, y: -3 }}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1.5 cursor-pointer"
              >
                <div
                  className="w-10 h-10 rounded-full relative overflow-hidden"
                  style={{
                    background: `linear-gradient(145deg, ${top}, ${mid}, ${bot})`,
                    boxShadow: sel
                      ? `0 0 0 2.5px ${t.accentColor}, 0 4px 12px -2px ${t.accentColor}50, inset 0 -3px 6px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,255,255,0.2)`
                      : `0 3px 8px -2px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.3), inset 0 1px 3px rgba(255,255,255,0.12)`,
                    border: sel ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="absolute top-0.5 left-1.5 w-3.5 h-2.5 rounded-full opacity-50"
                    style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.6), transparent 70%)' }}
                  />
                </div>
                <span className="text-[9px] text-white/40">{t.icon}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepPreview({ title, author, category, pages, coverColor, skyboxTheme, hasPdf }: any) {
  const theme = skyboxTheme ? skyboxThemes[skyboxTheme] : null;
  return (
    <div className="space-y-4 pt-2">
      <p className="text-[11px] text-amber-200/40">
        Your book is ready! Rotate the 3D preview to inspect, then hit Create.
      </p>
      <div className="space-y-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <Row label="Title" value={title} />
        <Row label="Author" value={author} />
        <Row label="Category" value={category} />
        <Row label="Pages" value={String(pages)} />
        <Row label="PDF" value={hasPdf ? '✓ Attached' : 'None'} />
        <Row label="Ambience" value={theme ? `${theme.icon} ${theme.name}` : 'Default Library'} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-amber-200/40 uppercase tracking-wider">{label}</span>
      <span className="text-[12px] text-amber-50/80 font-medium">{value || '—'}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Shared UI Pieces
   ═══════════════════════════════════════════════════ */

function InsetField({ label, value, onChange, placeholder, type = 'text', required, disabled }: any) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-amber-200/50 uppercase tracking-wider mb-2">
        {label} {required && <span className="text-amber-400/50">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl text-[13px] font-medium text-amber-50/85 placeholder-white/20 focus:outline-none disabled:opacity-50 tracking-wide"
        style={{
          background: 'linear-gradient(to bottom, rgba(15,8,2,0.5), rgba(25,15,5,0.3))',
          boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.25), 0 1px 0 rgba(255,200,100,0.03)',
          border: '1px solid rgba(255,200,100,0.06)',
        }}
      />
    </div>
  );
}

/** Small 3D orb button for zoom/reset controls */
function Orb3DButton({ onClick, label, small }: { onClick: () => void; label: string; small?: boolean }) {
  const size = small ? 28 : 34;
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.12, y: -2 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      className="flex items-center justify-center cursor-pointer text-white/70 font-bold select-none"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(145deg, rgba(60,40,20,0.9), rgba(25,15,5,0.95))',
        boxShadow: '0 4px 12px -3px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,200,100,0.08), inset 0 -2px 4px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,200,100,0.08)',
        fontSize: small ? 12 : 16,
      }}
    >
      {label}
    </motion.button>
  );
}

function adjustB(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0xff) + amt;
  const B = (num & 0xff) + amt;
  return '#' + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + (B < 255 ? (B < 1 ? 0 : B) : 255)).toString(16).slice(1);
}
