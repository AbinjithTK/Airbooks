export type FlipTheme = 'classic' | 'night' | 'sepia' | 'minimal';
export type ReaderTheme = 'parchment' | 'dark' | 'sepia' | 'white';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverColor: string;
  hasPdf: boolean;
  totalPdfPages?: number;
  pages: number;
  addedDate: string;
  category: string;
  pdfUrl?: string;
  shareId?: string;
  flipTheme?: FlipTheme;
  readerTheme?: ReaderTheme;
}
