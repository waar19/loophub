'use client';

import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ReactNode } from 'react';

// Fade in animation
export function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide up animation
export function SlideUp({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale on hover button
export function ScaleButton({
  children,
  onClick,
  disabled,
  className = '',
  whileHover = { scale: 1.02 },
  whileTap = { scale: 0.98 },
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  whileHover?: { scale?: number; rotate?: number; y?: number };
  whileTap?: { scale?: number };
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : whileHover}
      whileTap={disabled ? undefined : whileTap}
      transition={{ duration: 0.15 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

// Staggered list animation
export function StaggeredList({
  children,
  staggerDelay = 0.05,
  className = '',
}: {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.2 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Pulse animation for notifications
export function PulseAnimation({
  children,
  pulse = true,
  className = '',
}: {
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      animate={
        pulse
          ? {
              scale: [1, 1.05, 1],
              opacity: [1, 0.8, 1],
            }
          : {}
      }
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Success animation (checkmark)
export function SuccessAnimation({
  show,
  onComplete,
}: {
  show: boolean;
  onComplete?: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onAnimationComplete={() => onComplete?.()}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)',
            }}
          >
            ✓
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Skeleton shimmer animation
export function SkeletonShimmer({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{ background: 'var(--skeleton)' }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

// Tooltip animation
export function AnimatedTooltip({
  children,
  content,
  position = 'top',
}: {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const positionStyles = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' },
  };

  return (
    <motion.div className="relative inline-block group">
      {children}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileHover={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="absolute hidden group-hover:block px-2 py-1 text-xs rounded whitespace-nowrap z-50 pointer-events-none"
        style={{
          background: 'var(--foreground)',
          color: 'var(--background)',
          ...positionStyles[position],
        }}
      >
        {content}
      </motion.div>
    </motion.div>
  );
}

// Number counter animation
export function AnimatedNumber({
  value,
  duration = 0.5,
  className = '',
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration }}
      className={className}
    >
      {value}
    </motion.span>
  );
}

// Loading dots animation
export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{
            y: ['0%', '-50%', '0%'],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </span>
  );
}

// Card hover effect
export function AnimatedCard({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{
        y: -2,
        boxShadow: '0 10px 40px -15px rgba(0, 0, 0, 0.2)',
      }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.2 }}
      className={`card ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Page transition wrapper
export function PageTransition({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
