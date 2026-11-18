/**
 * Shared motion tokens for Javoodle.
 * Keep durations short and purposeful — premium, not cinematic.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.15,
  base: 0.22,
  enter: 0.32,
  slow: 0.45,
} as const;

/** Standard page/section entrance — fade + slight rise. */
export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.enter, ease: EASE },
  },
};

/** Container that staggers its direct motion children. */
export const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

/** Card/list-item entrance used inside a stagger container. */
export const rise = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.enter, ease: EASE },
  },
};

/** Subtle scale+fade for modals, popovers, toasts. */
export const pop = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 4,
    transition: { duration: DURATION.fast, ease: EASE },
  },
};
