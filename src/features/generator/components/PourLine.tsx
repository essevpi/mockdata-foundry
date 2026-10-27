import { AnimatePresence, motion } from 'motion/react';

type PourLineProps = {
  active: boolean;
  axis: 'x' | 'y';
  className?: string;
};

// A thin molten-gold line that fills along the seam while a generation runs: bottom to top
// between the panes, left to right across the Generate bar when stacked. Under reduced motion
// (see MotionConfig in App) it simply appears, so it stays a static highlight.
function PourLine({ active, axis, className = '' }: PourLineProps) {
  const vertical = axis === 'y';

  return (
    <AnimatePresence>
      {active && (
        <motion.span
          key="pour"
          animate={vertical ? { scaleY: 1 } : { scaleX: 1 }}
          aria-hidden="true"
          className={`pointer-events-none absolute bg-action ${
            vertical ? 'origin-bottom' : 'origin-left'
          } ${className}`}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          initial={vertical ? { scaleY: 0 } : { scaleX: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  );
}

export { PourLine };
