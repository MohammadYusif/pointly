'use client';

import { fadeLeft, fadeRight, fadeUp, smooth, viewportOnce } from '@/lib/motion';
import { type Variants, motion } from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

const directionVariants: Record<string, Variants> = {
  up: fadeUp,
  down: {
    hidden: { opacity: 0, y: -24 },
    visible: { opacity: 1, y: 0 },
  },
  left: fadeLeft,
  right: fadeRight,
};

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: ScrollRevealProps) {
  return (
    <motion.div
      className={className || undefined}
      variants={directionVariants[direction]}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ ...smooth, delay: delay * 0.1 }}
    >
      {children}
    </motion.div>
  );
}
