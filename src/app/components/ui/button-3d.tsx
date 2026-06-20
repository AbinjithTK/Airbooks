import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type MotionProps } from 'motion/react';

export type Button3DVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type Button3DSize = 'sm' | 'md' | 'lg';

interface Button3DProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: Button3DVariant;
  size?: Button3DSize;
  icon?: ReactNode;
  children?: ReactNode;
  /** Full-width mode */
  block?: boolean;
}

const VARIANTS: Record<Button3DVariant, {
  bg: string;
  shadow: string;
  shadowHover: string;
  shadowActive: string;
  text: string;
  border: string;
  glow: string;
}> = {
  primary: {
    bg: 'linear-gradient(145deg, #4285F4 0%, #1A73E8 50%, #1557B0 100%)',
    shadow: '0 6px 20px -4px rgba(66,133,244,0.5), 0 3px 6px -2px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.08)',
    shadowHover: '0 10px 30px -4px rgba(66,133,244,0.6), 0 4px 10px -2px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.06)',
    shadowActive: '0 2px 8px -2px rgba(66,133,244,0.4), 0 1px 3px rgba(0,0,0,0.1), inset 0 2px 6px rgba(0,0,0,0.12), inset 0 -1px 1px rgba(255,255,255,0.06)',
    text: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.1)',
    glow: 'rgba(66,133,244,0.3)',
  },
  secondary: {
    bg: 'linear-gradient(145deg, #FFFFFF 0%, #F1F5F9 40%, #E2E8F0 100%)',
    shadow: '0 4px 14px -3px rgba(0,0,0,0.15), 0 2px 4px -1px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.04)',
    shadowHover: '0 8px 22px -4px rgba(0,0,0,0.18), 0 3px 6px -2px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,1), inset 0 -2px 4px rgba(0,0,0,0.03)',
    shadowActive: '0 1px 4px -1px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08), inset 0 2px 6px rgba(0,0,0,0.08), inset 0 -1px 1px rgba(255,255,255,0.6)',
    text: '#1A2332',
    border: '1px solid rgba(0,0,0,0.08)',
    glow: 'rgba(0,0,0,0.08)',
  },
  ghost: {
    bg: 'linear-gradient(145deg, #f8f9fa 0%, #f1f3f5 100%)',
    shadow: '0 2px 8px -2px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.8)',
    shadowHover: '0 4px 14px -3px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.9)',
    shadowActive: '0 1px 3px rgba(0,0,0,0.08), inset 0 2px 4px rgba(0,0,0,0.06)',
    text: '#374151',
    border: '1px solid rgba(0,0,0,0.08)',
    glow: 'rgba(0,0,0,0.04)',
  },
  danger: {
    bg: 'linear-gradient(145deg, #FF5555 0%, #EF4444 40%, #DC2626 100%)',
    shadow: '0 6px 20px -4px rgba(239,68,68,0.5), 0 3px 6px -2px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.15)',
    shadowHover: '0 10px 30px -4px rgba(239,68,68,0.6), 0 4px 10px -2px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.12)',
    shadowActive: '0 2px 8px -2px rgba(239,68,68,0.4), 0 1px 3px rgba(0,0,0,0.2), inset 0 2px 6px rgba(0,0,0,0.25), inset 0 -1px 1px rgba(255,255,255,0.08)',
    text: '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.12)',
    glow: 'rgba(239,68,68,0.35)',
  },
};

const SIZES: Record<Button3DSize, { px: string; py: string; text: string; gap: string; radius: string }> = {
  sm: { px: '14px', py: '8px', text: '12px', gap: '6px', radius: '10px' },
  md: { px: '20px', py: '12px', text: '14px', gap: '8px', radius: '12px' },
  lg: { px: '28px', py: '16px', text: '16px', gap: '10px', radius: '14px' },
};

/**
 * 3D Skeuomorphic button — raised surface with inner highlights, depth shadows,
 * spring hover lift, and satisfying press-down on click. Feels like a physical
 * game UI control rather than a flat web button.
 */
export const Button3D = forwardRef<HTMLButtonElement, Button3DProps & MotionProps>(
  ({ variant = 'primary', size = 'md', icon, children, block, className = '', disabled, ...props }, ref) => {
    const v = VARIANTS[variant];
    const s = SIZES[size];

    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileHover={disabled ? undefined : { y: -3, scale: 1.03 }}
        whileTap={disabled ? undefined : { y: 1, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className={`relative inline-flex items-center justify-center font-semibold tracking-wide cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${block ? 'w-full' : ''} ${className}`}
        style={{
          padding: `${s.py} ${s.px}`,
          fontSize: s.text,
          gap: s.gap,
          borderRadius: s.radius,
          background: v.bg,
          boxShadow: v.shadow,
          border: v.border,
          color: v.text,
          lineHeight: 1.2,
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            (e.currentTarget as HTMLElement).style.boxShadow = v.shadowHover;
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = v.shadow;
        }}
        onPointerDown={(e) => {
          if (!disabled) {
            (e.currentTarget as HTMLElement).style.boxShadow = v.shadowActive;
          }
        }}
        onPointerUp={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = v.shadow;
        }}
        {...(props as any)}
      >
        {/* Top highlight strip */}
        <span
          className="absolute top-0 left-[10%] right-[10%] h-[1px] pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
        />
        {/* Inner top glow */}
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: s.radius,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 40%)',
          }}
        />
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
      </motion.button>
    );
  },
);

Button3D.displayName = 'Button3D';
