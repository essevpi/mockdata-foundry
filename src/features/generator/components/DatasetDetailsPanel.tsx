import { Minus, Plus } from 'lucide-react';
import { REQUEST_LIMITS, type ValidationIssue } from '../../../lib/generation';
import { canStepRecordCount, stepRecordCount } from '../field-utils';

const stepperButtonClassName =
  'grid size-10.5 place-items-center text-content transition focus-visible:-outline-offset-2 hover:bg-action/15 hover:text-content aria-disabled:cursor-not-allowed aria-disabled:text-content-muted/50 aria-disabled:hover:bg-transparent aria-disabled:hover:text-content-muted/50';

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
    <section>
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
          className="mt-2 block w-full resize-y rounded-xl border border-border-strong bg-input px-4 py-3 text-sm leading-6 text-content outline-none placeholder:text-content-muted focus:border-focus focus:ring-4 focus:ring-focus/30"
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

      <div className="mt-6 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div>
            <label htmlFor="record-count" className="text-sm font-medium text-content">
              Number of records
            </label>
            <p id="record-count-hint" className="mt-0.5 text-xs text-content-muted">
              {REQUEST_LIMITS.recordsMinCount}–{REQUEST_LIMITS.recordsMaxCount} records per
              generation
            </p>
          </div>
          <div
            className="flex items-center overflow-hidden rounded-xl border border-border-strong bg-input focus-within:border-focus focus-within:ring-4 focus-within:ring-focus/30"
            role="group"
            aria-label="Record count"
          >
            <button
              aria-label="Decrease record count"
              className={stepperButtonClassName}
              aria-disabled={!canStepRecordCount(recordCount, -1)}
              onClick={() => onRecordCountChange(stepRecordCount(recordCount, -1))}
              type="button"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <input
              id="record-count"
              aria-describedby="record-count-hint"
              max={REQUEST_LIMITS.recordsMaxCount}
              min={REQUEST_LIMITS.recordsMinCount}
              name="record-count"
              type="number"
              value={recordCount}
              onBlur={onCountBlur}
              onChange={(event) => onRecordCountChange(event.target.value)}
              className="h-10.5 w-16 border-x border-border bg-transparent px-1 text-center text-base font-medium tabular-nums text-content outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              aria-label="Increase record count"
              className={stepperButtonClassName}
              aria-disabled={!canStepRecordCount(recordCount, 1)}
              onClick={() => onRecordCountChange(stepRecordCount(recordCount, 1))}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
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
