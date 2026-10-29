import { FlaskConical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MockOutcome } from '../../../lib/mock-generator';
import { MockOutcomeControl } from './MockOutcomeControl';

type DevToolsProps = {
  outcome: MockOutcome;
  onOutcomeChange: (outcome: MockOutcome) => void;
};

const PANEL_ID = 'dev-tools-panel';

// Development-only corner widget, so the page layout stays exactly as it ships. GeneratorWorkspace
// renders it only when import.meta.env.DEV.
function DevTools({ outcome, onOutcomeChange }: DevToolsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed right-16 top-4 z-40 sm:right-[4.5rem] lg:bottom-3 lg:right-3 lg:top-auto">
      <button
        ref={buttonRef}
        aria-controls={open ? PANEL_ID : undefined}
        aria-expanded={open}
        aria-label="Dev tools"
        className="grid size-8 place-items-center rounded-full border border-border-strong bg-button text-content-muted opacity-60 transition hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <FlaskConical aria-hidden="true" className="size-4" />
      </button>

      {open && (
        <div
          aria-label="Dev tools"
          className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border-strong bg-surface p-3 shadow-lg lg:bottom-full lg:top-auto lg:mb-2 lg:mt-0"
          id={PANEL_ID}
          role="group"
        >
          <MockOutcomeControl
            outcome={outcome}
            onChange={(next) => {
              onOutcomeChange(next);
              setOpen(false);
              buttonRef.current?.focus();
            }}
          />
          <p className="mt-2 text-xs leading-5 text-content-muted">
            Development only. Forces the result of the next generation.
          </p>
        </div>
      )}
    </div>
  );
}

export { DevTools };
