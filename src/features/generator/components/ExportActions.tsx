import { downloadTextFile } from '../../../lib/download';
import { toCsv, toJson } from '../../../lib/export';
import type { PrimitiveValue } from '../../../lib/generation';

type ExportActionsProps = {
  columns: string[];
  records: Array<Record<string, PrimitiveValue>>;
};

const buttonClassName =
  'rounded-xl border border-border-strong bg-surface-raised px-4 py-2 text-sm font-semibold text-content transition hover:border-action hover:text-action';

function ExportActions({ columns, records }: ExportActionsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <button
          className={buttonClassName}
          onClick={() =>
            downloadTextFile('mockdata-records.json', toJson(records, columns), 'application/json')
          }
          type="button"
        >
          Download JSON
        </button>
        <p className="mt-2 text-xs leading-5 text-content-muted">
          A JSON array of records. Null values stay <span className="font-mono">null</span>.
        </p>
      </div>
      <div>
        <button
          className={buttonClassName}
          onClick={() =>
            downloadTextFile('mockdata-records.csv', toCsv(records, columns), 'text/csv')
          }
          type="button"
        >
          Download CSV
        </button>
        <p className="mt-2 text-xs leading-5 text-content-muted">
          Null is an empty field. Text is always quoted, so an empty string is{' '}
          <span className="font-mono">""</span>. Numbers and booleans are not quoted.
        </p>
        <p className="mt-1 text-xs leading-5 text-content-muted">
          Spreadsheet apps may treat text starting with <span className="font-mono">=</span>,{' '}
          <span className="font-mono">+</span>, <span className="font-mono">-</span> or{' '}
          <span className="font-mono">@</span> as a formula. Values are exported unchanged.
        </p>
      </div>
    </div>
  );
}

export { ExportActions };
