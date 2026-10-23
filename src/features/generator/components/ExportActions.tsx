import { downloadTextFile } from '../../../lib/download';
import { toCsv, toJson } from '../../../lib/export';
import type { PrimitiveValue } from '../../../lib/generation';

type ExportActionsProps = {
  columns: string[];
  records: Array<Record<string, PrimitiveValue>>;
};

const buttonClassName =
  'w-full whitespace-nowrap rounded-xl border border-border-strong bg-surface-raised px-4 py-2 text-sm font-semibold text-content transition hover:border-action hover:text-action';

const rowClassName = 'grid gap-3 p-4 @md:grid-cols-[10.5rem_minmax(0,1fr)] @md:gap-x-5';

const notesClassName = 'space-y-2 text-xs leading-5 text-content-muted';

function ExportActions({ columns, records }: ExportActionsProps) {
  return (
    <div className="@container divide-y divide-border rounded-xl border border-border bg-surface-inset">
      <div className={rowClassName}>
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
        </div>
        <div className={notesClassName}>
          <p>
            A JSON array of records. Null values stay <span className="font-mono">null</span>.
          </p>
        </div>
      </div>

      <div className={rowClassName}>
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
        </div>
        <div className={notesClassName}>
          <p>
            Null is an empty field. Text is always quoted, so an empty string is{' '}
            <span className="font-mono">""</span>. Numbers and booleans are not quoted.
          </p>
          <p className="border-l-2 border-border-strong pl-3">
            Spreadsheet apps may treat text starting with <span className="font-mono">=</span>,{' '}
            <span className="font-mono">+</span>, <span className="font-mono">-</span> or{' '}
            <span className="font-mono">@</span> as a formula. Values are exported unchanged.
          </p>
        </div>
      </div>
    </div>
  );
}

export { ExportActions };
