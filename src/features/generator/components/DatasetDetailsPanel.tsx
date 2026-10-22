import { REQUEST_LIMITS, type ValidationIssue } from '../../../lib/generation';

type DatasetDetailsPanelProps = {
  countIssues: ValidationIssue[];
  description: string;
  descriptionIssues: ValidationIssue[];
  recordCount: string;
  onCountBlur: () => void;
  onDescriptionBlur: () => void;
  onDescriptionChange: (description: string) => void;
  onRecordCountChange: (recordCount: string) => void;
};

function DatasetDetailsPanel({
  countIssues,
  description,
  descriptionIssues,
  recordCount,
  onCountBlur,
  onDescriptionBlur,
  onDescriptionChange,
  onRecordCountChange,
}: DatasetDetailsPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface/70 p-5 shadow-2xl shadow-shadow/20 sm:p-7">
      <h2 id="dataset-setup-heading" className="text-lg font-semibold text-content">
        Describe your dataset
      </h2>
      <p className="mt-1 text-sm leading-6 text-content-muted">
        Include the kind of records and the context that makes them useful.
      </p>

      <div className="mt-6">
        <label htmlFor="description" className="text-sm font-medium text-content">
          What should this data represent?
        </label>
        <textarea
          id="description"
          maxLength={REQUEST_LIMITS.descriptionMaxLength}
          name="description"
          placeholder="For example: active subscription customers for a European design tool, with varied plan usage and realistic company details."
          rows={6}
          value={description}
          onBlur={onDescriptionBlur}
          onChange={(event) => onDescriptionChange(event.target.value)}
          className="mt-2 block w-full resize-y rounded-xl border border-border bg-input px-4 py-3 text-sm leading-6 text-content outline-none placeholder:text-content-muted/70 focus:border-focus focus:ring-4 focus:ring-focus/15"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-content-muted">
            Up to {REQUEST_LIMITS.descriptionMaxLength.toLocaleString('en-US')} characters
          </p>
          <p className="text-xs tabular-nums text-content-muted">
            {description.length}/{REQUEST_LIMITS.descriptionMaxLength}
          </p>
        </div>
        {descriptionIssues.map((issue) => (
          <p key={issue.message} className="mt-2 text-xs text-danger">
            {issue.message}
          </p>
        ))}
      </div>

      <div className="mt-8 border-t border-border pt-7">
        <label htmlFor="record-count" className="text-sm font-medium text-content">
          Number of records
        </label>
        <p className="mt-1 text-sm text-content-muted">Choose a small, useful sample for now.</p>
        <input
          id="record-count"
          max={REQUEST_LIMITS.recordsMaxCount}
          min={REQUEST_LIMITS.recordsMinCount}
          name="record-count"
          type="number"
          value={recordCount}
          onBlur={onCountBlur}
          onChange={(event) => onRecordCountChange(event.target.value)}
          className="mt-3 block w-full rounded-xl border border-border bg-input px-4 py-3 text-base font-medium text-content outline-none focus:border-focus focus:ring-4 focus:ring-focus/15 sm:max-w-40"
        />
        <p className="mt-2 text-xs text-content-muted">
          {REQUEST_LIMITS.recordsMinCount}–{REQUEST_LIMITS.recordsMaxCount} records per generation
        </p>
        {countIssues.map((issue) => (
          <p key={issue.message} className="mt-2 text-xs text-danger">
            {issue.message}
          </p>
        ))}
      </div>
    </section>
  );
}

export { DatasetDetailsPanel };
