import { Check, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { downloadTextFile } from '../../../lib/download';
import { toCsv, toJson } from '../../../lib/export';
import type { PrimitiveValue } from '../../../lib/generation';

type ExportFormat = 'json' | 'csv';

type ExportFooterProps = {
  columns: string[];
  records: Array<Record<string, PrimitiveValue>>;
};

const buttonClassName =
  'flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-button px-3 text-sm font-semibold text-content transition hover:bg-action/15 hover:text-action @xl:w-auto @xl:justify-self-start @xl:px-4';

const notesClassName = 'col-span-2 space-y-2 text-xs leading-5 text-content-muted @xl:col-span-1';

const FORMAT_LABELS: Record<ExportFormat, string> = { json: 'JSON', csv: 'CSV' };

function Code({ children }: { children: string }) {
  return <span className="font-mono">{children}</span>;
}

type DownloadButtonProps = {
  downloaded: boolean;
  format: ExportFormat;
  onDownload: () => void;
};

// Both labels share one grid cell, so the button keeps the width of the longer one while it
// briefly confirms the download.
function DownloadButton({ downloaded, format, onDownload }: DownloadButtonProps) {
  return (
    <button
      aria-label={`Download ${FORMAT_LABELS[format]}`}
      className={buttonClassName}
      onClick={onDownload}
      type="button"
    >
      <span className="grid">
        <span
          className={`col-start-1 row-start-1 flex items-center justify-center gap-2 ${downloaded ? 'invisible' : ''}`}
        >
          Download {FORMAT_LABELS[format]}
          <Download aria-hidden="true" className="size-4 shrink-0" />
        </span>
        <span
          aria-hidden="true"
          className={`col-start-1 row-start-1 flex items-center justify-center gap-2 text-action ${downloaded ? '' : 'invisible'}`}
        >
          Downloaded
          <Check className="size-4 shrink-0" />
        </span>
      </span>
    </button>
  );
}

// The download buttons with how each file treats null, empty strings and formula-like text.
// Wide: each button sits above its own notes (JSON left, CSV right). Narrow: both buttons on
// one row, then the notes. Shown under the preview in both the Table and Editor views.
function ExportFooter({ columns, records }: ExportFooterProps) {
  const [downloaded, setDownloaded] = useState<ExportFormat | null>(null);
  const resetTimeout = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimeout.current), []);

  function download(format: ExportFormat) {
    if (format === 'json') {
      downloadTextFile('mockdata-records.json', toJson(records, columns), 'application/json');
    } else {
      downloadTextFile('mockdata-records.csv', toCsv(records, columns), 'text/csv');
    }

    setDownloaded(format);
    window.clearTimeout(resetTimeout.current);
    resetTimeout.current = window.setTimeout(() => setDownloaded(null), 2000);
  }

  return (
    <div className="@container flex-none border-t border-border pt-3">
      <span className="sr-only" role="status">
        {downloaded ? `${FORMAT_LABELS[downloaded]} file downloaded.` : ''}
      </span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 @xl:gap-x-8">
        <DownloadButton
          downloaded={downloaded === 'json'}
          format="json"
          onDownload={() => download('json')}
        />
        <DownloadButton
          downloaded={downloaded === 'csv'}
          format="csv"
          onDownload={() => download('csv')}
        />

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
