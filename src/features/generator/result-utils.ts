import type { PrimitiveValue } from '../../lib/generation';

export type CellDisplay = {
  kind: 'boolean' | 'empty' | 'null' | 'number' | 'text';
  text: string;
};

export function formatCellValue(value: PrimitiveValue): CellDisplay {
  if (value === null) {
    return { kind: 'null', text: 'null' };
  }

  if (typeof value === 'string') {
    return value === '' ? { kind: 'empty', text: '""' } : { kind: 'text', text: value };
  }

  if (typeof value === 'number') {
    return { kind: 'number', text: String(value) };
  }

  return { kind: 'boolean', text: String(value) };
}

export const RESULTS_VIEWS = ['table', 'editor'] as const;

export type ResultsView = (typeof RESULTS_VIEWS)[number];

export const RESULTS_VIEW_PANEL_ID = 'results-view-panel';

export function getResultsTabId(view: ResultsView): string {
  return `results-tab-${view}`;
}

// Arrow keys wrap around; Home and End jump to the first and last view. Other keys return
// undefined so the caller leaves them alone.
export function getNextResultsView(current: ResultsView, key: string): ResultsView | undefined {
  const index = RESULTS_VIEWS.indexOf(current);

  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return RESULTS_VIEWS[(index + 1) % RESULTS_VIEWS.length];
    case 'ArrowLeft':
    case 'ArrowUp':
      return RESULTS_VIEWS[(index - 1 + RESULTS_VIEWS.length) % RESULTS_VIEWS.length];
    case 'Home':
      return RESULTS_VIEWS[0];
    case 'End':
      return RESULTS_VIEWS[RESULTS_VIEWS.length - 1];
    default:
      return undefined;
  }
}
