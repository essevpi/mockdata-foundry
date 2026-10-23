import { Check, Copy, FileJson } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toJson } from '../../../lib/export';
import type { PrimitiveValue } from '../../../lib/generation';
import { tokenizeJsonLines, type JsonTokenKind } from '../json-tokens';

type JsonEditorViewProps = {
  columns: string[];
  records: Array<Record<string, PrimitiveValue>>;
};

type CopyStatus = 'idle' | 'copied' | 'failed';

const FILE_NAME = 'mockdata-records.json';

const tokenClassNames: Record<JsonTokenKind, string> = {
  boolean: 'text-focus',
  key: 'text-content',
  null: 'italic text-content-muted',
  number: 'text-focus',
  plain: '',
  punctuation: 'text-content-muted',
  string: 'text-action',
  whitespace: '',
};

const copyMessages: Record<CopyStatus, string> = {
  copied: 'Copied',
  failed: 'Couldn’t copy. Select the text instead.',
  idle: '',
};

function JsonEditorView({ columns, records }: JsonEditorViewProps) {
  // The same text the JSON download saves.
  const json = useMemo(() => toJson(records, columns), [records, columns]);
  const lines = useMemo(() => tokenizeJsonLines(json), [json]);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const resetTimeout = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimeout.current), []);

  async function handleCopy() {
    let status: CopyStatus = 'copied';

    try {
      await navigator.clipboard.writeText(json);
    } catch {
      status = 'failed';
    }

    setCopyStatus(status);
    window.clearTimeout(resetTimeout.current);
    resetTimeout.current = window.setTimeout(() => setCopyStatus('idle'), 2500);
  }

  return (
    <div className="flex min-h-0 flex-col lg:flex-1">
      <div className="flex h-[70svh] flex-col overflow-hidden rounded-xl border border-border bg-surface-inset lg:h-auto lg:min-h-64 lg:flex-1">
        <div className="flex h-9 flex-none items-center justify-between gap-3 border-b border-border bg-surface-raised px-3">
          <p className="flex min-w-0 items-center gap-2 font-mono text-xs text-content">
            <FileJson aria-hidden="true" className="size-4 flex-none text-content-muted" />
            <span className="truncate">{FILE_NAME}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-content-muted" role="status">
              {copyMessages[copyStatus]}
            </span>
            <button
              className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-content-muted transition hover:text-action"
              onClick={handleCopy}
              type="button"
            >
              {copyStatus === 'copied' ? (
                <Check aria-hidden="true" className="size-3.5" />
              ) : (
                <Copy aria-hidden="true" className="size-3.5" />
              )}
              Copy
            </button>
          </div>
        </div>

        {/* Focusable so keyboard users can scroll; the gutter stays put while scrolling sideways. */}
        <div
          aria-label="Generated JSON"
          className="relative min-h-0 flex-1 overflow-auto"
          role="region"
          tabIndex={0}
        >
          <div className="flex min-w-max font-mono text-xs leading-5">
            <div
              aria-hidden="true"
              className="sticky left-0 z-10 flex-none select-none border-r border-border bg-surface-inset px-3 py-3 text-right tabular-nums text-content-muted"
            >
              {lines.map((_, index) => (
                <div key={index}>{index + 1}</div>
              ))}
            </div>
            <pre className="flex-1 px-4 py-3">
              <code>
                {lines.map((line, lineIndex) => (
                  <span key={lineIndex} className="block min-h-5">
                    {line.map((token, tokenIndex) => (
                      <span key={tokenIndex} className={tokenClassNames[token.kind]}>
                        {token.text}
                      </span>
                    ))}
                  </span>
                ))}
              </code>
            </pre>
          </div>
        </div>
      </div>
      <p className="mt-3 flex-none text-xs text-content-muted">
        This is the file <span className="font-mono">Download JSON</span> saves.
      </p>
    </div>
  );
}

export { JsonEditorView };
