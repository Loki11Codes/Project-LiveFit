import type { Variants } from 'framer-motion';

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.1, type: 'spring', damping: 20, stiffness: 100 },
  }),
};

export const rowVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (index: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.15 + index * 0.05, type: 'spring', damping: 20, stiffness: 120 },
  }),
};

export const floatAnimation = {
  y: [0, -6, 0],
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
};
