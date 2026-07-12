import type { Variants, Transition } from 'framer-motion';
import { motion as tokens } from './tokens';

const EASE = tokens.easeOut as unknown as [number, number, number, number];

export const easeOut: Transition = {
  duration: tokens.duration.reveal,
  ease: EASE,
};

/**
 * Scroll reveal. Mirrors the design's `@keyframes shk-fade`
 * (opacity 0 -> 1, translateY 14px -> 0) but driven by viewport entry.
 */
export const reveal: Variants = {
  hidden: { opacity: 0, y: tokens.offset.lg },
  visible: { opacity: 1, y: 0, transition: easeOut },
};

/** The smaller `shk-fade-sm` variant (7px) — used for in-place content swaps. */
export const revealSm: Variants = {
  hidden: { opacity: 0, y: tokens.offset.sm },
  visible: { opacity: 1, y: 0, transition: { duration: tokens.duration.pop, ease: EASE } },
};

/** `shk-pop` — the booking modal's entrance. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: tokens.duration.pop, ease: EASE } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: tokens.duration.fast, ease: EASE } },
};

/** Parent that staggers its revealing children. */
export const stagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
});

/** Route transition — the design's `shk-fade .42s cubic-bezier(0.22,1,0.36,1)`. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: tokens.offset.lg },
  visible: { opacity: 1, y: 0, transition: { duration: tokens.duration.page, ease: EASE } },
  exit: { opacity: 0, transition: { duration: tokens.duration.fast, ease: EASE } },
};

/** Shared viewport config so reveals fire once, slightly before full entry. */
export const viewportOnce = { once: true, margin: '0px 0px -80px 0px' } as const;

/** Button/card micro-interactions. */
export const hoverLift = { scale: 1.02 };
export const tapPress = { scale: 0.98 };
