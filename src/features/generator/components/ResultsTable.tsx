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
    <div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface-inset">
        <table className="w-full min-w-max border-collapse text-left text-sm text-content">
          <caption className="sr-only">Generated records</caption>
          <thead className="bg-surface-raised text-xs text-content-muted">
            <tr>
              <th scope="col" className="w-px whitespace-nowrap px-3 py-2 text-right font-medium">
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
              <tr key={rowIndex} className="hover:bg-surface-raised/60">
                <th
                  scope="row"
                  className="w-px whitespace-nowrap px-3 py-2 text-right text-xs font-normal tabular-nums text-content-muted"
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

export { ResultsTable };
