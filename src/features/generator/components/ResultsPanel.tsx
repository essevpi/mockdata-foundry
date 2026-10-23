import { TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { GenerationState } from '../../../lib/generation';
import { ExportActions } from './ExportActions';
import { ResultsTable } from './ResultsTable';

type ResultsPanelProps = {
  state: GenerationState;
};

const SKELETON_ROW_WIDTHS = ['w-full', 'w-5/6', 'w-full', 'w-2/3', 'w-11/12', 'w-3/4'];

function formatRetryDelay(seconds: number) {
  const minutes = Math.ceil(seconds / 60);

  return minutes <= 1 ? 'about a minute' : `about ${minutes} minutes`;
}

function ResultsPanel({ state }: ResultsPanelProps) {
  const sectionRef = useRef<HTMLElement>(null);

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
        <h2 id="results-heading" className="text-lg font-semibold text-content">
          Results
        </h2>
        {/* The Table/Editor toggle goes here on success; the row keeps its height in every state. */}
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
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-5">
          <p className="text-sm text-content-muted" role="status">
            {state.result.records.length} {state.result.records.length === 1 ? 'record' : 'records'}{' '}
            generated.
          </p>
          <ExportActions columns={state.columns} records={state.result.records} />
          <ResultsTable columns={state.columns} records={state.result.records} />
        </div>
      )}
    </section>
  );
}

export { ResultsPanel };
