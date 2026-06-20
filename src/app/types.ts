export type FlipTheme = 'classic' | 'night' | 'sepia' | 'minimal';
export type ReaderTheme = 'parchment' | 'dark' | 'sepia' | 'white';
export type SkyboxTheme = 'forest' | 'ocean' | 'sunset' | 'night-sky' | 'cozy-cabin' | 'library' | 'arctic' | 'sakura';

export interface CoverImageTransform {
  x: number;      // % offset X
  y: number;      // % offset Y
  scale: number;  // 0.1–3
  rotation: number; // degrees
}

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
  skyboxTheme?: SkyboxTheme;
  coverImage?: string;
  coverImageTransform?: CoverImageTransform;
  backCoverImage?: string;
  backCoverImageTransform?: CoverImageTransform;
}
