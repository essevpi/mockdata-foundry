import { TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GenerationState } from '../../../lib/generation';
import {
  formatRetryDelay,
  getResultsTabId,
  RESULTS_VIEW_PANEL_ID,
  type ResultsView,
} from '../result-utils';
import { ExportFooter } from './ExportFooter';
import { JsonEditorView } from './JsonEditorView';
import { ResultsTable } from './ResultsTable';
import { ResultsViewToggle } from './ResultsViewToggle';

type ResultsPanelProps = {
  state: GenerationState;
};

const SKELETON_ROW_WIDTHS = ['w-full', 'w-5/6', 'w-full', 'w-2/3', 'w-11/12', 'w-3/4'];

function ResultsPanel({ state }: ResultsPanelProps) {
  const sectionRef = useRef<HTMLElement>(null);
  // Kept here, so the choice survives regenerating and errors until the page reloads.
  const [view, setView] = useState<ResultsView>('table');

  useEffect(() => {
    if (state.status === 'loading') {
      sectionRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [state.status]);

  return (
    <section
      ref={sectionRef}
      aria-busy={state.status === 'loading'}
      aria-labelledby="results-heading"
      className="flex flex-1 flex-col lg:min-h-0"
    >
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div>
          <h2 id="results-heading" className="text-lg font-semibold leading-6 text-content">
            Results
          </h2>
          {/* Always rendered so the title keeps its place in every state. */}
          <p className="h-4 text-xs leading-4 text-content-muted" role="status">
            {state.status === 'success'
              ? `${state.result.records.length} ${
                  state.result.records.length === 1 ? 'record' : 'records'
                } generated.`
              : ''}
          </p>
        </div>
        {/* The toggle shows on success only; the row keeps its height in every state. */}
        {state.status === 'success' && <ResultsViewToggle view={view} onChange={setView} />}
      </div>

      {state.status === 'idle' && (
        <div className="mt-2 flex flex-1 flex-col justify-center rounded-xl border border-dashed border-border bg-surface-inset px-5 py-10 text-center">
          <h3 className="text-sm font-semibold text-content">No data yet</h3>
          <p className="mt-2 text-sm leading-6 text-content-muted">
            Generated records will appear here.
          </p>
        </div>
      )}

      {state.status === 'loading' && (
        <div
          className="mt-2 flex flex-1 flex-col gap-6 rounded-xl border border-border bg-surface-inset p-5"
          role="status"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-border-strong border-t-action motion-reduce:animate-none"
            />
            <p className="text-sm text-content">Generating your data…</p>
          </div>
          <div aria-hidden="true" className="space-y-3">
            {SKELETON_ROW_WIDTHS.map((width, index) => (
              <div
                key={index}
                className={`h-4 animate-pulse rounded bg-surface-raised motion-reduce:animate-none ${width}`}
              />
            ))}
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div
          className="mt-2 rounded-xl border border-l-4 border-danger/60 border-l-danger bg-surface-inset px-5 py-4"
          role="alert"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-danger">
            <TriangleAlert aria-hidden="true" className="size-4" />
            Generation failed
          </h3>
          <p className="mt-2 text-sm leading-6 text-content">{state.error.message}</p>
          {state.error.retryAfterSeconds !== undefined && (
            <p className="mt-1 text-sm text-content-muted">
              You can try again in {formatRetryDelay(state.error.retryAfterSeconds)}.
            </p>
          )}
          <p className="mt-3 text-xs text-content-muted">Your description and fields were kept.</p>
        </div>
      )}

      {state.status === 'success' && (
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-4">
          <div
            aria-labelledby={getResultsTabId(view)}
            className="flex min-h-0 flex-col lg:flex-1"
            id={RESULTS_VIEW_PANEL_ID}
            role="tabpanel"
          >
            {view === 'table' ? (
              <ResultsTable columns={state.columns} records={state.result.records} />
            ) : (
              <JsonEditorView columns={state.columns} records={state.result.records} />
            )}
          </div>
          <ExportFooter columns={state.columns} records={state.result.records} />
        </div>
      )}
    </section>
  );
}

export { ResultsPanel };
