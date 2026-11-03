import type {
  GenerateRequest,
  GenerateSuccess,
  GenerationError,
  GenerationState,
  PrimitiveValue,
} from '../../lib/generation';

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

// No HTTP reply reached the browser: either generate()'s own timeout fired (the function is
// still slower than its 60 s limit allows) or the network failed.
export function getNoResponseMessage(error: unknown): string {
  return error instanceof DOMException && error.name === 'TimeoutError'
    ? 'Generation took too long and was stopped. Please try again, or ask for fewer records.'
    : 'The server could not be reached. Check your connection and try again.';
}

// Columns follow the submitted field order, which previews and exports keep.
export function createSuccessState(
  request: GenerateRequest,
  result: GenerateSuccess,
): Extract<GenerationState, { status: 'success' }> {
  return { status: 'success', result, columns: request.fields.map((field) => field.name) };
}

// The error state records when the error arrived, so a retry time is fixed from that moment.
export function createErrorState(
  error: GenerationError['error'],
  receivedAt = Date.now(),
): Extract<GenerationState, { status: 'error' }> {
  return { status: 'error', error, receivedAt };
}

type ClockOptions = { locale?: string; timeZone?: string };

// When a rate-limited user can generate again. Short waits (Groq's per-minute budget) read as
// "under a minute"; longer ones as a clock time rounded up to the minute, so it is never early.
export function describeRetry(
  retryAfterSeconds: number,
  receivedAt: number,
  { locale, timeZone }: ClockOptions = {},
): string {
  if (retryAfterSeconds < 60) {
    return 'You can try again in under a minute.';
  }

  const retryAt = Math.ceil((receivedAt + retryAfterSeconds * 1_000) / 60_000) * 60_000;
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(retryAt);

  return `You can generate again by ${time}.`;
}
