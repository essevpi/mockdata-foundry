import { Download } from 'lucide-react';
import { downloadTextFile } from '../../../lib/download';
import { toCsv, toJson } from '../../../lib/export';
import type { PrimitiveValue } from '../../../lib/generation';

type ExportFooterProps = {
  columns: string[];
  records: Array<Record<string, PrimitiveValue>>;
};

const buttonClassName =
  'flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-button px-3 text-sm font-semibold text-content transition hover:bg-action/15 hover:text-action @xl:w-auto @xl:justify-self-start @xl:px-4';

const notesClassName = 'col-span-2 space-y-2 text-xs leading-5 text-content-muted @xl:col-span-1';

function Code({ children }: { children: string }) {
  return <span className="font-mono">{children}</span>;
}

// The download buttons with how each file treats null, empty strings and formula-like text.
// Wide: each button sits above its own notes (JSON left, CSV right). Narrow: both buttons on
// one row, then the notes. Shown under the preview in both the Table and Editor views.
function ExportFooter({ columns, records }: ExportFooterProps) {
  return (
    <div className="@container flex-none border-t border-border pt-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 @xl:gap-x-8">
        <button
          className={buttonClassName}
          onClick={() =>
            downloadTextFile('mockdata-records.json', toJson(records, columns), 'application/json')
          }
          type="button"
        >
          Download JSON
          <Download aria-hidden="true" className="size-4 shrink-0" />
        </button>
        <button
          className={buttonClassName}
          onClick={() =>
            downloadTextFile('mockdata-records.csv', toCsv(records, columns), 'text/csv')
          }
          type="button"
        >
          Download CSV
          <Download aria-hidden="true" className="size-4 shrink-0" />
        </button>

        <div className={notesClassName}>
          <p>
            <span className="font-semibold text-content">JSON</span> is an array of records. Null
            values stay <Code>null</Code>.
          </p>
          <p>
            In the table and Editor, <Code>null</Code> marks a missing value and <Code>""</Code> an
            empty string.
          </p>
        </div>
        <div className={notesClassName}>
          <p>
            <span className="font-semibold text-content">CSV</span> writes null as an empty field.
            Text is always quoted, so an empty string is <Code>""</Code>. Numbers and booleans are
            not quoted.
          </p>
          <p>
            Spreadsheet apps may treat text starting with <Code>=</Code>, <Code>+</Code>,{' '}
            <Code>-</Code> or <Code>@</Code> as a formula. Values are exported unchanged.
          </p>
        </div>
      </div>
    </div>
  );
}

export { ExportFooter };
