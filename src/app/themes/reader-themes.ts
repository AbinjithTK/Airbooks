import { ReaderTheme } from '../types';

export interface ReaderThemeConfig {
  name: string;
  pageBackground: string;
  textColor: string;
  metaColor: string;
  ruledLineColor: string;
  titleAccent: string;
  headerBg: string;
  headerText: string;
  swatch: string;
}

export const readerThemes: Record<ReaderTheme, ReaderThemeConfig> = {
  parchment: {
    name: 'Parchment',
    pageBackground: '#F4ECD8',
    textColor: '#3D2B1F',
    metaColor: '#8B6914',
    ruledLineColor: '#C4A96A',
    titleAccent: '#8B4513',
    headerBg: '#EDE0C4',
    headerText: '#3D2B1F',
    swatch: '#F4ECD8',
  },
  dark: {
    name: 'Dark',
    pageBackground: '#1A1F2E',
    textColor: '#CBD5E1',
    metaColor: '#475569',
    ruledLineColor: '#2D3748',
    titleAccent: '#3B82F6',
    headerBg: '#111827',
    headerText: '#F1F5F9',
    swatch: '#1A1F2E',
  },
  sepia: {
    name: 'Sepia',
    pageBackground: '#FDF6E3',
    textColor: '#433422',
    metaColor: '#7C6133',
    ruledLineColor: '#D4B896',
    titleAccent: '#8B5E3C',
    headerBg: '#EDD9A3',
    headerText: '#433422',
    swatch: '#FDF6E3',
  },
  white: {
    name: 'White',
    pageBackground: '#FFFFFF',
    textColor: '#1A1A1A',
    metaColor: '#94A3B8',
    ruledLineColor: '#E2E8F0',
    titleAccent: '#0F6FFF',
    headerBg: '#F8FAFB',
    headerText: '#1A2332',
    swatch: '#FFFFFF',
  },
};
