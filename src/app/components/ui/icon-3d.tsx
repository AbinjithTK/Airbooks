import { type ReactNode } from 'react';
import { motion, type MotionProps } from 'motion/react';

export type Icon3DColor = 'blue' | 'amber' | 'green' | 'purple' | 'rose' | 'cyan' | 'neutral';
export type Icon3DSize = 'sm' | 'md' | 'lg' | 'xl';

interface Icon3DProps extends MotionProps {
  color?: Icon3DColor;
  size?: Icon3DSize;
  children: ReactNode;
  className?: string;
  /** If true, the orb subtly floats/bounces */
  animate?: boolean;
}

const COLORS: Record<Icon3DColor, { bg: string; glow: string; specular: string }> = {
  blue: {
    bg: 'linear-gradient(145deg, #4285F4 0%, #1A73E8 40%, #1557B0 100%)',
    glow: 'rgba(66,133,244,0.4)',
    specular: 'rgba(180,220,255,0.6)',
  },
  amber: {
    bg: 'linear-gradient(145deg, #FBBC05 0%, #F9A825 40%, #F57F17 100%)',
    glow: 'rgba(251,188,5,0.4)',
    specular: 'rgba(255,240,180,0.6)',
  },
  green: {
    bg: 'linear-gradient(145deg, #34A853 0%, #1E8E3E 40%, #137333 100%)',
    glow: 'rgba(52,168,83,0.4)',
    specular: 'rgba(180,255,200,0.6)',
  },
  purple: {
    bg: 'linear-gradient(145deg, #A142F4 0%, #8430CE 40%, #6A1B9A 100%)',
    glow: 'rgba(161,66,244,0.4)',
    specular: 'rgba(220,180,255,0.6)',
  },
  rose: {
    bg: 'linear-gradient(145deg, #FF4081 0%, #EA4335 40%, #C62828 100%)',
    glow: 'rgba(234,67,53,0.4)',
    specular: 'rgba(255,200,210,0.6)',
  },
  cyan: {
    bg: 'linear-gradient(145deg, #67E8F9 0%, #06B6D4 40%, #0891B2 100%)',
    glow: 'rgba(6,182,212,0.4)',
    specular: 'rgba(180,250,255,0.6)',
  },
  neutral: {
    bg: 'linear-gradient(145deg, #F1F5F9 0%, #94A3B8 40%, #64748B 100%)',
    glow: 'rgba(100,116,139,0.3)',
    specular: 'rgba(255,255,255,0.5)',
  },
};

const SIZES: Record<Icon3DSize, { box: number; icon: string; radius: string; specW: string; specH: string }> = {
  sm: { box: 32, icon: '16px', radius: '9px', specW: '12px', specH: '8px' },
  md: { box: 40, icon: '20px', radius: '11px', specW: '16px', specH: '10px' },
  lg: { box: 52, icon: '24px', radius: '14px', specW: '20px', specH: '12px' },
  xl: { box: 64, icon: '30px', radius: '16px', specW: '24px', specH: '14px' },
};

/**
 * 3D Icon orb — wraps a Lucide icon (or any SVG) in a glossy, lit,
 * rounded-square shape with depth shadows, specular highlight, and
 * optional float animation. Designed to match the game-like UI aesthetic.
 */
export function Icon3D({
  color = 'blue',
  size = 'md',
  children,
  className = '',
  animate: shouldAnimate,
  ...motionProps
}: Icon3DProps) {
  const c = COLORS[color];
  const s = SIZES[size];

  return (
    <motion.div
      whileHover={shouldAnimate !== false ? { scale: 1.08, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.radius,
        background: c.bg,
        boxShadow: `
          0 6px 16px -4px ${c.glow},
          0 3px 6px -2px rgba(0,0,0,0.2),
          inset 0 1px 2px rgba(255,255,255,0.25),
          inset 0 -2px 4px rgba(0,0,0,0.2)
        `,
        border: '1px solid rgba(255,255,255,0.12)',
      }}
      {...motionProps}
    >
      {/* Specular highlight — top-left glossy spot */}
      <span
        className="absolute pointer-events-none"
        style={{
          top: '12%',
          left: '15%',
          width: s.specW,
          height: s.specH,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at 50% 40%, ${c.specular}, transparent 70%)`,
        }}
      />
      {/* Bottom ambient reflection */}
      <span
        className="absolute bottom-0 left-[15%] right-[15%] h-[2px] rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />
      {/* Icon */}
      <span
        className="relative z-10 text-white drop-shadow-sm flex items-center justify-center"
        style={{ width: s.icon, height: s.icon }}
      >
        {children}
      </span>
    </motion.div>
  );
}
