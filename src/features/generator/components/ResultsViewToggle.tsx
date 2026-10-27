import { Braces, Table2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, type KeyboardEvent } from 'react';
import {
  getNextResultsView,
  getResultsTabId,
  RESULTS_VIEW_PANEL_ID,
  type ResultsView,
} from '../result-utils';

type ResultsViewToggleProps = {
  view: ResultsView;
  onChange: (view: ResultsView) => void;
};

const TABS = [
  { view: 'table', label: 'Table', Icon: Table2 },
  { view: 'editor', label: 'Editor', Icon: Braces },
] as const satisfies ReadonlyArray<{ view: ResultsView; label: string; Icon: typeof Table2 }>;

function ResultsViewToggle({ view, onChange }: ResultsViewToggleProps) {
  const tabRefs = useRef<Partial<Record<ResultsView, HTMLButtonElement | null>>>({});

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const nextView = getNextResultsView(view, event.key);

    if (nextView === undefined) {
      return;
    }

    event.preventDefault();
    onChange(nextView);
    tabRefs.current[nextView]?.focus();
  }

  return (
    <div
      aria-label="Result view"
      className="flex h-11 items-stretch rounded-xl border border-border-strong bg-surface-inset p-0.5"
      onKeyDown={handleKeyDown}
      role="tablist"
    >
      {TABS.map(({ view: tabView, label, Icon }) => {
        const selected = tabView === view;

        return (
          <button
            key={tabView}
            ref={(element) => {
              tabRefs.current[tabView] = element;
            }}
            aria-controls={RESULTS_VIEW_PANEL_ID}
            aria-selected={selected}
            className={`relative flex items-center rounded-[10px] px-3.5 text-sm transition-colors ${
              selected
                ? 'font-semibold text-content'
                : 'font-medium text-content-muted hover:text-content'
            }`}
            id={getResultsTabId(tabView)}
            onClick={() => onChange(tabView)}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {selected && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-[10px] bg-surface-raised after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-action"
                layoutId="results-view-indicator"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { ResultsViewToggle };
