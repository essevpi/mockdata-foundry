import { useEffect, useRef } from 'react';
import type { GenerationState } from '../../../lib/generation';
import { ExportActions } from './ExportActions';
import { ResultsTable } from './ResultsTable';

type ResultsPanelProps = {
  state: GenerationState;
};

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
      className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-7"
    >
      <h2 id="results-heading" className="text-lg font-semibold text-content">
        Results
      </h2>

      {state.status === 'idle' && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-surface-inset/50 px-5 py-10 text-center">
          <h3 className="text-sm font-semibold text-content">No data yet</h3>
          <p className="mt-2 text-sm leading-6 text-content-muted">
            Generated records will appear here.
          </p>
        </div>
      )}

      {state.status === 'loading' && (
        <div
          className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-surface-inset/50 px-5 py-6"
          role="status"
        >
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-border border-t-action motion-reduce:animate-none"
          />
          <p className="text-sm text-content">Generating your data…</p>
        </div>
      )}

      {state.status === 'error' && (
        <div
          className="mt-6 rounded-xl border border-danger/50 bg-surface-inset/50 px-5 py-4"
          role="alert"
        >
          <h3 className="text-sm font-semibold text-danger">Generation failed</h3>
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
        <div className="mt-4 space-y-5">
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
