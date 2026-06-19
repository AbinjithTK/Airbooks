/**
 * Skybox ambient themes — immersive 360° environment moods for the reading experience.
 * Each theme defines layered CSS gradients that evoke a real-world setting.
 */

export type SkyboxTheme =
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'night-sky'
  | 'cozy-cabin'
  | 'library'
  | 'arctic'
  | 'sakura';

export interface SkyboxThemeConfig {
  /** Display name shown in the picker */
  name: string;
  /** Short evocative description */
  description: string;
  /** Primary ambient gradient (applied as page/world background) */
  gradient: string;
  /** Secondary overlay gradient for depth */
  overlayGradient: string;
  /** Accent color for UI elements within this theme */
  accentColor: string;
  /** Fog/mist tint used in the 3D world */
  fogColor: string;
  /** Ambient light color for 3D scene */
  ambientLight: string;
  /** Directional/sun light color */
  directionalLight: string;
  /** Light intensity multiplier (0–2) */
  lightIntensity: number;
  /** Preview swatch colors [top, middle, bottom] for the orb preview */
  previewColors: [string, string, string];
  /** Emoji icon for compact UI */
  icon: string;
}

export const skyboxThemes: Record<SkyboxTheme, SkyboxThemeConfig> = {
  forest: {
    name: 'Forest Path',
    description: 'Dappled sunlight through lush green canopy',
    gradient:
      'radial-gradient(ellipse at 50% 20%, #4ADE80 0%, #166534 35%, #052E16 70%, #022C22 100%)',
    overlayGradient:
      'linear-gradient(180deg, rgba(74,222,128,0.08) 0%, rgba(5,46,22,0.4) 60%, rgba(2,44,34,0.7) 100%)',
    accentColor: '#4ADE80',
    fogColor: '#1A4D2E',
    ambientLight: '#2DD4BF',
    directionalLight: '#FDE68A',
    lightIntensity: 0.9,
    previewColors: ['#86EFAC', '#166534', '#052E16'],
    icon: '🌲',
  },
  ocean: {
    name: 'Deep Ocean',
    description: 'Calm turquoise waters with gentle light rays',
    gradient:
      'radial-gradient(ellipse at 50% 30%, #67E8F9 0%, #0891B2 30%, #164E63 60%, #0C1E2E 100%)',
    overlayGradient:
      'linear-gradient(180deg, rgba(103,232,249,0.1) 0%, rgba(8,145,178,0.3) 40%, rgba(12,30,46,0.6) 100%)',
    accentColor: '#22D3EE',
    fogColor: '#0E4456',
    ambientLight: '#67E8F9',
    directionalLight: '#A5F3FC',
    lightIntensity: 0.7,
    previewColors: ['#A5F3FC', '#0891B2', '#0C1E2E'],
    icon: '🌊',
  },
  sunset: {
    name: 'Golden Sunset',
    description: 'Warm horizon glow with dusky purple clouds',
    gradient:
      'radial-gradient(ellipse at 50% 70%, #FBBF24 0%, #F97316 25%, #DB2777 55%, #4C1D95 85%, #1E1B4B 100%)',
    overlayGradient:
      'linear-gradient(180deg, rgba(251,191,36,0.05) 0%, rgba(219,39,119,0.15) 50%, rgba(30,27,75,0.5) 100%)',
    accentColor: '#FB923C',
    fogColor: '#7C2D12',
    ambientLight: '#FBBF24',
    directionalLight: '#FDE68A',
    lightIntensity: 1.2,
    previewColors: ['#FDE68A', '#F97316', '#4C1D95'],
    icon: '🌅',
  },
  'night-sky': {
    name: 'Starlit Night',
    description: 'Deep cosmos with distant starlight and nebula',
    gradient:
      'radial-gradient(ellipse at 50% 40%, #312E81 0%, #1E1B4B 35%, #0F0A2A 65%, #030014 100%)',
    overlayGradient:
      'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(30,27,75,0.2) 50%, rgba(3,0,20,0.5) 100%)',
    accentColor: '#818CF8',
    fogColor: '#1E1B4B',
    ambientLight: '#6366F1',
    directionalLight: '#C4B5FD',
    lightIntensity: 0.4,
    previewColors: ['#6366F1', '#312E81', '#030014'],
    icon: '✨',
  },
  'cozy-cabin': {
    name: 'Cozy Cabin',
    description: 'Warm firelight and rich wood tones',
    gradient:
      'radial-gradient(ellipse at 50% 60%, #F59E0B 0%, #B45309 30%, #78350F 55%, #1C0F00 100%)',
    overlayGradient:
      'linear-gradient(180deg, rgba(245,158,11,0.08) 0%, rgba(120,53,15,0.3) 50%, rgba(28,15,0,0.6) 100%)',
    accentColor: '#F59E0B',
    fogColor: '#451A03',
    ambientLight: '#FBBF24',
    directionalLight: '#FDE68A',
    lightIntensity: 1.0,
    previewColors: ['#FDE68A', '#B45309', '#1C0F00'],
    icon: '🏠',
  },
  library: {
    name: 'Grand Library',
    description: 'Mahogany shelves and soft reading lamp glow',
    gradient:
      'radial-gradient(ellipse at 50% 30%, #D97706 0%, #92400E 30%, #451A03 60%, #1A0800 100%)',
    overlayGradient:
      'linear-gradient(180deg, rgba(217,119,6,0.06) 0%, rgba(69,26,3,0.35) 50%, rgba(26,8,0,0.7) 100%)',
    accentColor: '#D97706',
    fogColor: '#3B1506',
    ambientLight: '#F59E0B',
    directionalLight: '#FCD34D',
    lightIntensity: 0.8,
    previewColors: ['#FCD34D', '#92400E', '#1A0800'],
    icon: '📚',
  },
  arctic: {
    name: 'Arctic Aurora',
    description: 'Icy blue expanse with shimmering northern lights',
    gradient:
      'radial-gradient(ellipse at 50% 20%, #A5F3FC 0%, #0E7490 25%, #155E75 50%, #0C2D3E 80%, #041520 100%)',
    overlayGradient:
      'linear-gradient(180deg, rgba(165,243,252,0.08) 0%, rgba(14,116,144,0.2) 40%, rgba(4,21,32,0.6) 100%)',
    accentColor: '#06B6D4',
    fogColor: '#083344',
    ambientLight: '#22D3EE',
    directionalLight: '#A5F3FC',
    lightIntensity: 0.6,
    previewColors: ['#ECFEFF', '#0E7490', '#041520'],
    icon: '❄️',
  },
  sakura: {
    name: 'Sakura Garden',
    description: 'Soft pink blossoms under a gentle spring sky',
    gradient:
      'radial-gradient(ellipse at 50% 30%, #FBCFE8 0%, #EC4899 30%, #BE185D 55%, #500724 85%, #1A0410 100%)',
    overlayGradient:
      'linear-gradient(180deg, rgba(251,207,232,0.1) 0%, rgba(190,24,93,0.2) 50%, rgba(26,4,16,0.5) 100%)',
    accentColor: '#F472B6',
    fogColor: '#500724',
    ambientLight: '#F9A8D4',
    directionalLight: '#FBCFE8',
    lightIntensity: 0.9,
    previewColors: ['#FBCFE8', '#EC4899', '#500724'],
    icon: '🌸',
  },
};

/** Ordered list for rendering in picker UI */
export const skyboxThemeOrder: SkyboxTheme[] = [
  'forest',
  'ocean',
  'sunset',
  'night-sky',
  'cozy-cabin',
  'library',
  'arctic',
  'sakura',
];
