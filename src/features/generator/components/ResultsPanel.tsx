import { useEffect, useRef } from 'react';
import type { GenerationState, PrimitiveValue } from '../../../lib/generation';
import { formatCellValue } from '../result-utils';

type ResultsPanelProps = {
  state: GenerationState;
};

const cellClassNames = {
  boolean: 'font-mono text-xs',
  empty: 'font-mono text-xs text-content-muted',
  null: 'rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs italic text-content-muted',
  number: 'font-mono text-xs tabular-nums',
  text: '',
} as const;

function formatRetryDelay(seconds: number) {
  const minutes = Math.ceil(seconds / 60);

  return minutes <= 1 ? 'about a minute' : `about ${minutes} minutes`;
}

function ResultCell({ value }: { value: PrimitiveValue }) {
  const { kind, text } = formatCellValue(value);

  return <span className={cellClassNames[kind]}>{text}</span>;
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

      {state.status === 'success' && <ResultsTable records={state.result.records} />}
    </section>
  );
}

function ResultsTable({ records }: { records: Array<Record<string, PrimitiveValue>> }) {
  const columns = Object.keys(records[0] ?? {});

  return (
    <div className="mt-4">
      <p className="text-sm text-content-muted" role="status">
        {records.length} {records.length === 1 ? 'record' : 'records'} generated.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-max border-collapse text-left text-sm text-content">
          <caption className="sr-only">Generated records</caption>
          <thead className="bg-surface-raised text-xs uppercase tracking-wide text-content-muted">
            <tr>
              <th scope="col" className="px-3 py-2 text-right font-medium">
                #
              </th>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-medium normal-case">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  scope="row"
                  className="px-3 py-2 text-right text-xs font-normal tabular-nums text-content-muted"
                >
                  {rowIndex + 1}
                </th>
                {columns.map((column) => (
                  <td key={column} className="px-3 py-2">
                    <ResultCell value={record[column]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-content-muted">
        <span className="font-mono">null</span> marks a missing value; <span className="font-mono">""</span>{' '}
        is an empty string.
      </p>
    </div>
  );
}

export { ResultsPanel };
