import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft, Save, BookOpen, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2,
  List, ListOrdered, Quote, Minus, Undo, Redo,
  PenLine, Keyboard, Eye, Download,
} from 'lucide-react';
import { Typewriter3D } from '../components/typewriter-3d';
import { Button3D } from '../components/ui/button-3d';
import { Icon3D } from '../components/ui/icon-3d';
import { useAppContext } from '../components/app-layout';

type ViewMode = 'editor' | 'typewriter' | 'preview';

/**
 * Full-screen Writer workspace with:
 * - Rich text editor with formatting toolbar
 * - 3D Typewriter mode (immersive typing experience)
 * - Preview mode (see how it looks as a book page)
 * - Word/character count, auto-save indication
 */
export function WriterPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { books } = useAppContext();
  const book = books.find(b => b.id === id);
  const isNew = id === 'new';

  const [title, setTitle] = useState(book?.title || 'Untitled');
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [saved, setSaved] = useState(true);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);

  // Update counts
  useEffect(() => {
    const words = content.split(/\s+/).filter(Boolean).length;
    const chars = content.length;
    setWordCount(words);
    setCharCount(chars);
  }, [content]);

  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      setContent(text);
      setSaved(false);
    }
  }, []);

  const handleSave = () => {
    setSaved(true);
    // Would persist to server here
  };

  const execCommand = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    handleContentChange();
  };

  const handleTypewriterText = useCallback((text: string) => {
    setContent(text);
    setSaved(false);
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex flex-col" style={{ background: 'linear-gradient(180deg, #1a0e06 0%, #0f0804 100%)' }}>
      {/* ══════ TOP BAR ══════ */}
      <div
        className="flex items-center justify-between px-5 py-3 z-20 flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(30,18,8,0.95), rgba(20,12,5,0.9))',
          borderBottom: '1px solid rgba(255,200,100,0.06)',
        }}
      >
        {/* Left: Back + Title */}
        <div className="flex items-center gap-4">
          <Button3D variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/')}>
            Library
          </Button3D>
          <div className="h-6 w-px bg-white/10" />
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
            className="bg-transparent text-amber-50/90 font-semibold text-sm focus:outline-none border-none w-48 placeholder-white/30"
            placeholder="Book title..."
          />
        </div>

        {/* Center: View mode toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,200,100,0.06)' }}>
          <ModeBtn active={viewMode === 'editor'} onClick={() => setViewMode('editor')} icon={<PenLine className="w-3.5 h-3.5" />} label="Editor" />
          <ModeBtn active={viewMode === 'typewriter'} onClick={() => setViewMode('typewriter')} icon={<Keyboard className="w-3.5 h-3.5" />} label="Typewriter" />
          <ModeBtn active={viewMode === 'preview'} onClick={() => setViewMode('preview')} icon={<Eye className="w-3.5 h-3.5" />} label="Preview" />
        </div>

        {/* Right: Stats + Save */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[11px] text-amber-200/40">
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
          </div>
          <Button3D variant="primary" size="sm" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
            {saved ? 'Saved' : 'Save'}
          </Button3D>
        </div>
      </div>

      {/* ══════ MAIN CONTENT ══════ */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'editor' && (
          <div className="h-full flex flex-col">
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 px-6 py-2 flex-shrink-0 overflow-x-auto" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,200,100,0.04)' }}>
              <ToolGroup>
                <ToolBtn icon={<Undo className="w-4 h-4" />} onClick={() => execCommand('undo')} title="Undo" />
                <ToolBtn icon={<Redo className="w-4 h-4" />} onClick={() => execCommand('redo')} title="Redo" />
              </ToolGroup>
              <ToolSep />
              <ToolGroup>
                <ToolBtn icon={<Heading1 className="w-4 h-4" />} onClick={() => execCommand('formatBlock', 'h1')} title="Heading 1" />
                <ToolBtn icon={<Heading2 className="w-4 h-4" />} onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2" />
              </ToolGroup>
              <ToolSep />
              <ToolGroup>
                <ToolBtn icon={<Bold className="w-4 h-4" />} onClick={() => execCommand('bold')} title="Bold" />
                <ToolBtn icon={<Italic className="w-4 h-4" />} onClick={() => execCommand('italic')} title="Italic" />
                <ToolBtn icon={<Underline className="w-4 h-4" />} onClick={() => execCommand('underline')} title="Underline" />
              </ToolGroup>
              <ToolSep />
              <ToolGroup>
                <ToolBtn icon={<AlignLeft className="w-4 h-4" />} onClick={() => execCommand('justifyLeft')} title="Align Left" />
                <ToolBtn icon={<AlignCenter className="w-4 h-4" />} onClick={() => execCommand('justifyCenter')} title="Center" />
                <ToolBtn icon={<AlignRight className="w-4 h-4" />} onClick={() => execCommand('justifyRight')} title="Align Right" />
              </ToolGroup>
              <ToolSep />
              <ToolGroup>
                <ToolBtn icon={<List className="w-4 h-4" />} onClick={() => execCommand('insertUnorderedList')} title="Bullet List" />
                <ToolBtn icon={<ListOrdered className="w-4 h-4" />} onClick={() => execCommand('insertOrderedList')} title="Numbered List" />
                <ToolBtn icon={<Quote className="w-4 h-4" />} onClick={() => execCommand('formatBlock', 'blockquote')} title="Quote" />
                <ToolBtn icon={<Minus className="w-4 h-4" />} onClick={() => execCommand('insertHorizontalRule')} title="Divider" />
              </ToolGroup>
            </div>

            {/* Editor area */}
            <div className="flex-1 overflow-y-auto flex justify-center py-8">
              <div
                className="w-full max-w-3xl mx-auto px-12 py-10 min-h-[80vh] rounded-2xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(250,248,244,0.97), rgba(245,240,230,0.95))',
                  boxShadow: '0 12px 40px -8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleContentChange}
                  className="outline-none text-[#2a1a0d] text-base leading-relaxed min-h-[60vh] prose prose-headings:text-[#1a0e06] prose-headings:font-bold prose-p:text-[#3d2a18] prose-blockquote:border-amber-400 prose-blockquote:text-amber-900/70"
                  style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}
                  data-placeholder="Start writing your story..."
                />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'typewriter' && (
          <Typewriter3D onTextChange={handleTypewriterText} initialText={content} />
        )}

        {viewMode === 'preview' && (
          <div className="h-full overflow-y-auto flex justify-center py-12 px-4">
            <div className="w-full max-w-2xl">
              {/* Book page preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-12 min-h-[80vh]"
                style={{
                  background: '#faf8f4',
                  boxShadow: '0 20px 60px -12px rgba(0,0,0,0.5), 4px 4px 0 rgba(200,190,170,0.3)',
                  border: '1px solid rgba(200,190,170,0.4)',
                }}
              >
                <h1 className="text-3xl font-bold text-[#1a0e06] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  {title}
                </h1>
                {book && <p className="text-sm text-amber-800/50 mb-8">{book.author}</p>}
                <div
                  className="text-[#3d2a18] leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: 'Georgia, serif', fontSize: '15px' }}
                >
                  {content || 'Your content will appear here as you write...'}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* ══════ BOTTOM STATUS ══════ */}
      <div
        className="flex items-center justify-between px-6 py-2 flex-shrink-0 z-20"
        style={{ background: 'rgba(20,12,5,0.9)', borderTop: '1px solid rgba(255,200,100,0.04)' }}
      >
        <span className="text-[10px] text-amber-200/30">
          {viewMode === 'typewriter' ? 'Type on your keyboard — keys animate in 3D' : 'Rich text editor — format your book content'}
        </span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${saved ? 'bg-green-400/60' : 'bg-amber-400/60'}`} />
          <span className="text-[10px] text-amber-200/30">{saved ? 'All changes saved' : 'Unsaved changes'}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════ Sub-components ═══════ */

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
        active ? 'text-amber-100/90' : 'text-white/30 hover:text-white/60'
      }`}
      style={active ? { background: 'rgba(255,200,100,0.1)', border: '1px solid rgba(255,200,100,0.12)' } : { border: '1px solid transparent' }}
    >
      {icon}
      {label}
    </button>
  );
}

function ToolBtn({ icon, onClick, title }: { icon: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -1 }}
      whileTap={{ scale: 0.9 }}
      title={title}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-200/50 hover:text-amber-100/80 hover:bg-white/5 transition-colors cursor-pointer"
    >
      {icon}
    </motion.button>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolSep() {
  return <div className="w-px h-5 bg-white/8 mx-2" />;
}
