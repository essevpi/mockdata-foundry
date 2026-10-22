import { REQUEST_LIMITS, type ValidationIssue } from '../../../lib/generation';
import { ADD_FIELD_BUTTON_ID, getFieldValidationIssues, type FieldDraft } from '../field-utils';
import { FieldEditor } from './FieldEditor';

type FieldBuilderPanelProps = {
  fields: FieldDraft[];
  fieldsIssues: ValidationIssue[];
  validationIssues: ValidationIssue[];
  onAddField: () => void;
  onRemoveField: (index: number) => void;
  onUpdateField: (index: number, updates: Partial<FieldDraft>) => void;
};

function FieldBuilderPanel({
  fields,
  fieldsIssues,
  validationIssues,
  onAddField,
  onRemoveField,
  onUpdateField,
}: FieldBuilderPanelProps) {
  const atFieldLimit = fields.length >= REQUEST_LIMITS.fieldsMaxCount;

  return (
    <section
      aria-labelledby="field-builder-heading"
      className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="field-builder-heading" className="text-lg font-semibold text-content">
            Define your fields
          </h2>
          <p className="mt-1 text-sm leading-6 text-content-muted">
            Choose the information each record should contain.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-medium tabular-nums text-content-muted">
          {fields.length}/{REQUEST_LIMITS.fieldsMaxCount}
        </span>
      </div>

      {fields.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-surface-inset/50 px-5 py-10 text-center">
          <div
            aria-hidden="true"
            className="mx-auto grid size-10 place-items-center rounded-full bg-surface-raised text-lg text-content-muted"
          >
            +
          </div>
          <h3 className="mt-4 text-sm font-semibold text-content">No fields yet</h3>
          <p className="mt-2 text-sm leading-6 text-content-muted">
            Start with the information every record should include.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {fields.map((field, index) => (
            <li key={field.id}>
              <FieldEditor
                field={field}
                index={index}
                issues={getFieldValidationIssues(validationIssues, index)}
                onRemove={() => onRemoveField(index)}
                onUpdate={(updates) => onUpdateField(index, updates)}
              />
            </li>
          ))}
        </ul>
      )}

      {fieldsIssues.map((issue) => (
        <p key={issue.message} className="mt-3 text-xs text-danger">
          {issue.message}
        </p>
      ))}

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          className="rounded-xl border border-border bg-surface-raised px-5 py-2.5 text-sm font-semibold text-content transition hover:border-action hover:text-action-hover disabled:cursor-not-allowed disabled:border-border/60 disabled:bg-surface disabled:text-content-muted/60"
          disabled={atFieldLimit}
          id={ADD_FIELD_BUTTON_ID}
          onClick={onAddField}
          type="button"
        >
          {fields.length === 0 ? 'Add your first field' : 'Add field'}
        </button>
        <p className="text-xs leading-5 text-content-muted">
          {atFieldLimit
            ? `You can include up to ${REQUEST_LIMITS.fieldsMaxCount} fields in one dataset.`
            : 'Use clear names such as customerName or invoice_total.'}
        </p>
      </div>
    </section>
  );
}

export { FieldBuilderPanel };
