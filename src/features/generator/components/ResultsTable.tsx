import type { PrimitiveValue } from '../../../lib/generation';
import { formatCellValue } from '../result-utils';

type ResultsTableProps = {
  columns: string[];
  records: Array<Record<string, PrimitiveValue>>;
};

const cellClassNames = {
  boolean: 'font-mono text-xs',
  empty: 'font-mono text-xs text-content-muted',
  null: 'rounded border border-border bg-surface-raised px-1.5 py-0.5 font-mono text-xs italic text-content-muted',
  number: 'font-mono text-xs tabular-nums',
  text: '',
} as const;

function ResultCell({ value }: { value: PrimitiveValue }) {
  const { kind, text } = formatCellValue(value);

  return <span className={cellClassNames[kind]}>{text}</span>;
}

function ResultsTable({ columns, records }: ResultsTableProps) {
  return (
    <div className="flex min-h-0 flex-col lg:flex-1">
      {/* Focusable so keyboard users can scroll the table; sticky header row and # column. */}
      <div
        aria-label="Generated records"
        className="table-scroll relative h-[70svh] overflow-auto rounded-xl border border-border lg:h-auto lg:min-h-64 lg:flex-1"
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-max border-separate border-spacing-0 text-left text-sm text-content">
          <caption className="sr-only">Generated records</caption>
          <thead className="text-xs text-content-muted">
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-20 w-px whitespace-nowrap h-9 border-b border-r border-border bg-surface-inset px-3 py-0 text-right font-medium"
              >
                #
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="sticky top-0 z-10 h-9 border-b border-border bg-surface-inset px-3 py-0 font-medium normal-case"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record, rowIndex) => (
              <tr key={rowIndex} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-10 w-px whitespace-nowrap border-b border-r border-border bg-surface px-3 py-2 text-right text-xs font-normal tabular-nums text-content-muted group-hover:bg-surface-raised"
                >
                  {rowIndex + 1}
                </th>
                {columns.map((column) => (
                  <td key={column} className="border-b border-border px-3 py-2 group-hover:bg-surface-raised/60">
                    <ResultCell value={record[column]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { ResultsTable };
