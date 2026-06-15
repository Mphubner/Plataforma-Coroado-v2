export const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
} as const;

export const pagePreset = pageMotion;

export const panelMotion = {
  initial: { opacity: 0, y: 8, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
} as const;

export function listItemMotion(index = 0) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.18, delay: Math.min(index * 0.025, 0.18), ease: [0.22, 1, 0.36, 1] },
  } as const;
}
