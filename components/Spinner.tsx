'use client';

import { motion } from 'framer-motion';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export default function Spinner({
  size = 'md',
  color = 'var(--brand)',
  className = '',
}: SpinnerProps) {
  const sizes = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  };

  const s = sizes[size];

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ width: s, height: s }}
    >
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: `${s / 8}px solid rgba(0, 0, 0, 0.1)`,
        }}
      />
      {/* Spinning arc */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          borderTop: `${s / 8}px solid ${color}`,
          borderRight: `${s / 8}px solid transparent`,
          borderBottom: `${s / 8}px solid transparent`,
          borderLeft: `${s / 8}px solid transparent`,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  );
}

// Branded loading animation with logo
export function BrandedSpinner({
  size = 'lg',
  text,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
}) {
  const sizes = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const s = sizes[size];

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        className="relative"
        style={{ width: s, height: s }}
      >
        {/* Pulsing background */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, var(--brand), var(--accent))',
            opacity: 0.2,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.1, 0.2],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Logo */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-full"
          style={{
            background: 'linear-gradient(135deg, var(--brand), var(--accent))',
            color: 'white',
            fontSize: s / 2.5,
            fontWeight: 'bold',
          }}
          animate={{
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          ∞
        </motion.div>
        {/* Orbiting dot */}
        <motion.div
          className="absolute"
          style={{
            width: s / 6,
            height: s / 6,
            background: 'var(--brand)',
            borderRadius: '50%',
            top: -s / 12,
            left: '50%',
            marginLeft: -s / 12,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
          transformTemplate={({ rotate }) =>
            `rotate(${rotate}) translateY(${s / 2 + s / 12}px)`
          }
        />
      </motion.div>
      {text && (
        <motion.p
          className="text-sm font-medium"
          style={{ color: 'var(--muted)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

// Button loading state
export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <motion.span
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <motion.span
        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.span>
  );
}

// Full page loading overlay
export function FullPageLoader({
  text = 'Cargando...',
}: {
  text?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--background)' }}
    >
      <BrandedSpinner size="xl" text={text} />
    </motion.div>
  );
}
