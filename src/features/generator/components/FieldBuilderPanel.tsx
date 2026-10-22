import { REQUEST_LIMITS, type FieldDefinition, type ValidationIssue } from '../../../lib/generation';
import { getFieldValidationIssues } from '../field-utils';
import { FieldEditor } from './FieldEditor';

type FieldBuilderPanelProps = {
  fields: FieldDefinition[];
  validationIssues: ValidationIssue[];
  onAddField: () => void;
  onRemoveField: (index: number) => void;
  onUpdateField: (index: number, updates: Partial<FieldDefinition>) => void;
};

function FieldBuilderPanel({
  fields,
  validationIssues,
  onAddField,
  onRemoveField,
  onUpdateField,
}: FieldBuilderPanelProps) {
  return (
    <aside className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-content">Your dataset</p>
          <p className="mt-1 text-sm leading-6 text-content-muted">
            Define the fields each record should contain.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-medium tabular-nums text-content-muted">
          {fields.length}/{REQUEST_LIMITS.fieldsMaxCount}
        </span>
      </div>

      {fields.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-surface-inset/50 px-5 py-10 text-center">
          <div
            aria-hidden="true"
            className="mx-auto grid size-10 place-items-center rounded-full bg-surface-raised text-lg text-content-muted"
          >
            +
          </div>
          <h2 className="mt-4 text-sm font-semibold text-content">No fields yet</h2>
          <p className="mt-2 text-sm leading-6 text-content-muted">
            Start with the information every record should include.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {fields.map((field, index) => (
            <FieldEditor
              key={index}
              field={field}
              index={index}
              issues={getFieldValidationIssues(validationIssues, index)}
              onRemove={() => onRemoveField(index)}
              onUpdate={(updates) => onUpdateField(index, updates)}
            />
          ))}
        </div>
      )}

      <button
        className="mt-6 w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-content transition hover:border-action hover:text-action-hover disabled:cursor-not-allowed disabled:border-border/60 disabled:bg-surface disabled:text-content-muted/60"
        disabled={fields.length === REQUEST_LIMITS.fieldsMaxCount}
        onClick={onAddField}
        type="button"
      >
        {fields.length === 0 ? 'Add your first field' : 'Add field'}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-content-muted">
        {fields.length === REQUEST_LIMITS.fieldsMaxCount
          ? 'You can include up to eight fields in one dataset.'
          : 'Use clear names such as customerName or invoice_total.'}
      </p>

      <button
        className="mt-6 w-full rounded-xl bg-surface-raised px-4 py-3 text-sm font-semibold text-content-muted"
        disabled
        type="button"
      >
        Generate data
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-content-muted">
        Add a description and at least one valid field to continue.
      </p>
    </aside>
  );
}

export { FieldBuilderPanel };
