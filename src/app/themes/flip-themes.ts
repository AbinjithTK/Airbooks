import { FlipTheme } from '../types';

export interface FlipThemeConfig {
  name: string;
  pageBackground: string;
  pageBackgroundBack: string;
  paperTexture: boolean;
  paperTextureOpacity: number;
  spineGradient: string;
  shadowRgb: string;       // "R,G,B" used to build rgba()
  shadowIntensity: number; // multiplier applied to opacity values
  highlightRgb: string;    // specular highlight color "R,G,B"
  gutterShadowRgb: string;
  cornerPeelColor: string;
  bookShadowBox: string;
  ambientBackground: string;
  foldCreaseRgb: string;
  swatch: string;          // small color shown in the theme picker UI
}

function rgba(rgb: string, alpha: number): string {
  return `rgba(${rgb},${alpha})`;
}

export { rgba as themeRgba };

export const flipThemes: Record<FlipTheme, FlipThemeConfig> = {
  classic: {
    name: 'Classic',
    pageBackground: '#FDFBF7',
    pageBackgroundBack: '#F5F0E8',
    paperTexture: true,
    paperTextureOpacity: 0.03,
    spineGradient: 'linear-gradient(90deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.07) 50%, rgba(0,0,0,0.2) 100%)',
    shadowRgb: '0,0,0',
    shadowIntensity: 1.0,
    highlightRgb: '255,255,255',
    gutterShadowRgb: '0,0,0',
    cornerPeelColor: '#E2E8F0',
    bookShadowBox: '4px 4px 20px rgba(0,0,0,0.15), -4px 4px 20px rgba(0,0,0,0.15)',
    ambientBackground: 'linear-gradient(135deg, #F8FAFB 0%, #E8F2FF 50%, #F8FAFB 100%)',
    foldCreaseRgb: '0,0,0',
    swatch: '#FDFBF7',
  },
  night: {
    name: 'Night',
    pageBackground: '#1A1F2E',
    pageBackgroundBack: '#151922',
    paperTexture: false,
    paperTextureOpacity: 0,
    spineGradient: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0.6) 100%)',
    shadowRgb: '0,0,0',
    shadowIntensity: 1.6,
    highlightRgb: '100,149,237',
    gutterShadowRgb: '0,0,0',
    cornerPeelColor: '#2D3748',
    bookShadowBox: '4px 4px 32px rgba(0,0,0,0.6), -4px 4px 32px rgba(0,0,0,0.6)',
    ambientBackground: 'linear-gradient(135deg, #070B18 0%, #111827 50%, #070B18 100%)',
    foldCreaseRgb: '100,149,237',
    swatch: '#1A1F2E',
  },
  sepia: {
    name: 'Sepia',
    pageBackground: '#F4ECD8',
    pageBackgroundBack: '#EDE0C4',
    paperTexture: true,
    paperTextureOpacity: 0.06,
    spineGradient: 'linear-gradient(90deg, rgba(101,67,33,0.35) 0%, rgba(101,67,33,0.1) 50%, rgba(101,67,33,0.35) 100%)',
    shadowRgb: '80,50,20',
    shadowIntensity: 0.9,
    highlightRgb: '255,248,220',
    gutterShadowRgb: '80,50,20',
    cornerPeelColor: '#D4B896',
    bookShadowBox: '4px 4px 20px rgba(80,50,20,0.25), -4px 4px 20px rgba(80,50,20,0.25)',
    ambientBackground: 'linear-gradient(135deg, #FDF6E3 0%, #EDD9A3 50%, #FDF6E3 100%)',
    foldCreaseRgb: '101,67,33',
    swatch: '#F4ECD8',
  },
  minimal: {
    name: 'Minimal',
    pageBackground: '#FFFFFF',
    pageBackgroundBack: '#F9FAFB',
    paperTexture: false,
    paperTextureOpacity: 0,
    spineGradient: 'linear-gradient(90deg, rgba(0,0,0,0.07) 0%, rgba(0,0,0,0.02) 50%, rgba(0,0,0,0.07) 100%)',
    shadowRgb: '0,0,0',
    shadowIntensity: 0.45,
    highlightRgb: '255,255,255',
    gutterShadowRgb: '0,0,0',
    cornerPeelColor: '#F1F5F9',
    bookShadowBox: '2px 2px 12px rgba(0,0,0,0.08), -2px 2px 12px rgba(0,0,0,0.08)',
    ambientBackground: '#FFFFFF',
    foldCreaseRgb: '0,0,0',
    swatch: '#FFFFFF',
  },
};
