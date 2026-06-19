import { X, Upload, BookOpen, FileText, CheckCircle2, Cloud, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef } from 'react';
import { Book, SkyboxTheme } from '../types';
import { storePdfPersistent } from '../pdf-store';
import { saveBook, uploadPdfToCloud } from '../supabase-books';
import { SkyboxPicker } from './skybox-picker';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (book: Book) => void;
}

export function AddBookModal({ isOpen, onClose, onAdded }: AddBookModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Fiction');
  const [pages, setPages] = useState(200);
  const [coverColor, setCoverColor] = useState('#0F6FFF');
  const [skyboxTheme, setSkyboxTheme] = useState<SkyboxTheme | undefined>(undefined);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [cloudUploading, setCloudUploading] = useState(false);
  const [cloudUploadDone, setCloudUploadDone] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Once metadata is created on the server we keep its id so a retry re-uploads
  // to the SAME book instead of creating a duplicate.
  const [createdBookId, setCreatedBookId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    '#0F6FFF', '#0EA5E9', '#8B5CF6', '#EC4899', '#EF4444',
    '#F59E0B', '#10B981', '#6366F1', '#14B8A6', '#F97316'
  ];

  const categories = ['Fiction', 'Non-Fiction', 'Science', 'Biography', 'Technology', 'Art', 'History', 'Philosophy'];

  const processPdfFile = async (file: File) => {
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const numPages = pdf.numPages;

      setPdfFile(file);
      setPdfArrayBuffer(arrayBuffer);
      setPdfPageCount(numPages);
      setPages(numPages);

      // Try to extract title from PDF metadata
      const metadata = await pdf.getMetadata().catch(() => null);
      if (metadata?.info) {
        const info = metadata.info as Record<string, string>;
        if (info.Title && !title) setTitle(info.Title);
        if (info.Author && !author) setAuthor(info.Author);
      }
    } catch (err) {
      console.error('Error processing PDF:', err);
      alert('Failed to read PDF file. Please try another file.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudUploading(true);
    setUploadError(null);

    // 1. Persist book metadata to the user's library on the server. We pass
    //    hasPdf:false here — the server flips it to true only once the PDF
    //    upload actually lands in cloud storage, so a failed upload never
    //    leaves a phantom "has PDF" book behind. Reuse the id on retry.
    const saved = await saveBook({
      ...(createdBookId ? { id: createdBookId } : {}),
      title,
      author,
      category,
      pages: pdfPageCount || pages,
      coverColor,
      hasPdf: false,
      totalPdfPages: pdfPageCount || undefined,
      skyboxTheme,
    });

    if (!saved) {
      setCloudUploading(false);
      setUploadError(
        'Could not save the book to your library. Please check your connection and try again.',
      );
      return;
    }
    setCreatedBookId(saved.id);

    let finalBook: Book = saved;

    // 2. If a PDF was attached, store it locally (instant offline reads) AND
    //    upload it to private cloud storage right away. The cloud upload is
    //    required: if it fails we surface the error and keep the modal open so
    //    the user can retry — the book is NOT silently added without its PDF.
    if (pdfArrayBuffer) {
      await storePdfPersistent(saved.id, pdfArrayBuffer);
      const uploadedUrl = await uploadPdfToCloud(saved.id, pdfArrayBuffer);
      if (!uploadedUrl) {
        setCloudUploading(false);
        setUploadError(
          'Saving the PDF to the cloud failed. Your details are kept — press “Add Book” to retry the upload.',
        );
        return;
      }
      finalBook = { ...saved, hasPdf: true, pdfUrl: uploadedUrl };
      setCloudUploadDone(true);
    }

    setCloudUploading(false);
    onAdded(finalBook);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setCategory('Fiction');
    setPages(200);
    setCoverColor('#0F6FFF');
    setSkyboxTheme(undefined);
    setPdfFile(null);
    setPdfArrayBuffer(null);
    setPdfPageCount(0);
    setUploading(false);
    setCloudUploading(false);
    setCloudUploadDone(false);
    setUploadError(null);
    setCreatedBookId(null);
    setDragOver(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processPdfFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      processPdfFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const removePdfFile = () => {
    setPdfFile(null);
    setPdfArrayBuffer(null);
    setPdfPageCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { resetForm(); onClose(); }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1A2332] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-[#1A2332] border-b border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#0F6FFF] to-[#0EA5E9] rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-[#1A2332] dark:text-[#F1F5F9]">
                    Add New Book
                  </h2>
                </div>
                <button
                  onClick={() => { resetForm(); onClose(); }}
                  className="p-2 rounded-lg hover:bg-[#F8FAFB] dark:hover:bg-[#1E293B] transition-colors"
                >
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* PDF Upload - First */}
                <div>
                  <label className="block text-sm font-medium text-[#1A2332] dark:text-[#F1F5F9] mb-3">
                    Upload PDF
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload"
                  />

                  {!pdfFile ? (
                    <label
                      htmlFor="pdf-upload"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      className={`flex flex-col items-center justify-center w-full px-6 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        dragOver
                          ? 'border-[#0F6FFF] bg-[#E8F2FF] dark:border-[#3B82F6] dark:bg-[#1E3A5F]'
                          : 'border-[#0F6FFF]/30 dark:border-[#3B82F6]/30 bg-[#F8FAFB] dark:bg-[#0A1628] hover:border-[#0F6FFF] dark:hover:border-[#3B82F6] hover:bg-[#E8F2FF] dark:hover:bg-[#1E3A5F]'
                      }`}
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-3 border-[#0F6FFF]/30 border-t-[#0F6FFF] rounded-full animate-spin" />
                          <p className="text-sm text-[#64748B]">Processing PDF...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-[#0F6FFF] dark:text-[#3B82F6] mb-3" />
                          <p className="text-[#1A2332] dark:text-[#F1F5F9] font-medium">
                            Drop your PDF here or click to browse
                          </p>
                          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                            PDF files up to 50MB
                          </p>
                        </>
                      )}
                    </label>
                  ) : (
                    <div className="flex items-center gap-4 p-4 bg-[#E8F2FF] dark:bg-[#1E3A5F] rounded-xl">
                      <div className="w-12 h-12 bg-[#0F6FFF]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-[#0F6FFF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1A2332] dark:text-[#F1F5F9] truncate">
                          {pdfFile.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                          <p className="text-xs text-[#10B981]">
                            {pdfPageCount} pages detected &bull; {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removePdfFile}
                        className="p-2 rounded-lg hover:bg-white/50 dark:hover:bg-black/20 transition-colors"
                      >
                        <X className="w-4 h-4 text-[#64748B]" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-[#1A2332] dark:text-[#F1F5F9] mb-2">
                    Book Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Enter book title..."
                    className="w-full px-4 py-3 bg-[#F8FAFB] dark:bg-[#0A1628] border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 rounded-xl text-[#1A2332] dark:text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0F6FFF] dark:focus:ring-[#3B82F6] focus:border-transparent"
                  />
                </div>

                {/* Author */}
                <div>
                  <label className="block text-sm font-medium text-[#1A2332] dark:text-[#F1F5F9] mb-2">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    required
                    placeholder="Enter author name..."
                    className="w-full px-4 py-3 bg-[#F8FAFB] dark:bg-[#0A1628] border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 rounded-xl text-[#1A2332] dark:text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#0F6FFF] dark:focus:ring-[#3B82F6] focus:border-transparent"
                  />
                </div>

                {/* Category and Pages */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A2332] dark:text-[#F1F5F9] mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F8FAFB] dark:bg-[#0A1628] border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 rounded-xl text-[#1A2332] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0F6FFF] dark:focus:ring-[#3B82F6] focus:border-transparent"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A2332] dark:text-[#F1F5F9] mb-2">
                      Pages {pdfPageCount > 0 && <span className="text-[#10B981]">(from PDF)</span>}
                    </label>
                    <input
                      type="number"
                      value={pdfPageCount || pages}
                      onChange={(e) => setPages(Number(e.target.value))}
                      min="1"
                      required
                      disabled={pdfPageCount > 0}
                      className="w-full px-4 py-3 bg-[#F8FAFB] dark:bg-[#0A1628] border border-[#0F6FFF]/10 dark:border-[#3B82F6]/20 rounded-xl text-[#1A2332] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 focus:ring-[#0F6FFF] dark:focus:ring-[#3B82F6] focus:border-transparent disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Cover Color */}
                <div>
                  <label className="block text-sm font-medium text-[#1A2332] dark:text-[#F1F5F9] mb-3">
                    Cover Color
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCoverColor(color)}
                        className={`w-12 h-12 rounded-xl transition-all ${
                          coverColor === color
                            ? 'ring-4 ring-[#0F6FFF] dark:ring-[#3B82F6] ring-offset-2 ring-offset-white dark:ring-offset-[#1A2332] scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Skybox Ambient Theme */}
                <SkyboxPicker value={skyboxTheme} onChange={setSkyboxTheme} />

                {/* Cloud upload status */}
                {cloudUploading && (
                  <div className="flex items-center gap-3 p-3 bg-[#E8F2FF] dark:bg-[#1E3A5F] rounded-xl">
                    <div className="w-4 h-4 border-2 border-[#0F6FFF]/30 border-t-[#0F6FFF] rounded-full animate-spin flex-shrink-0" />
                    <span className="text-sm text-[#0F6FFF]">Saving to your cloud library…</span>
                  </div>
                )}
                {cloudUploadDone && !cloudUploading && (
                  <div className="flex items-center gap-3 p-3 bg-[#D1FAE5] dark:bg-[#064E3B] rounded-xl">
                    <Cloud className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                    <span className="text-sm text-[#10B981]">Saved to your cloud library</span>
                  </div>
                )}
                {uploadError && !cloudUploading && (
                  <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-600 dark:text-red-400">{uploadError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => { resetForm(); onClose(); }}
                    className="px-6 py-3 text-[#1A2332] dark:text-[#F1F5F9] hover:bg-[#F8FAFB] dark:hover:bg-[#1E293B] rounded-xl transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || cloudUploading}
                    className="px-6 py-3 bg-gradient-to-r from-[#0F6FFF] to-[#0EA5E9] text-white rounded-xl hover:shadow-lg hover:shadow-[#0F6FFF]/30 transition-all font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {cloudUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Uploading…
                      </>
                    ) : 'Add Book'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
