import { Plus } from 'lucide-react';
import { REQUEST_LIMITS, type ValidationIssue } from '../../../lib/generation';
import { FIELD_ROW_COLUMNS, FIELD_ROW_GAP } from '../field-row-layout';
import {
  FIELD_PROBLEMS_ID,
  getFieldValidationIssues,
  getInvalidFieldIndexes,
  type FieldDraft,
  type FieldProblem,
} from '../field-utils';
import { FieldEditor } from './FieldEditor';

type FieldBuilderPanelProps = {
  fields: FieldDraft[];
  problems: FieldProblem[];
  validationIssues: ValidationIssue[];
  onAddField: () => void;
  onRemoveField: (index: number) => void;
  onUpdateField: (index: number, updates: Partial<FieldDraft>) => void;
};

function FieldBuilderPanel({
  fields,
  problems,
  validationIssues,
  onAddField,
  onRemoveField,
  onUpdateField,
}: FieldBuilderPanelProps) {
  const invalidIndexes = getInvalidFieldIndexes(problems);

  return (
    <section
      aria-labelledby="field-builder-heading"
      className="border-t border-border-strong pt-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="field-builder-heading" className="text-lg font-semibold text-content">
            Define your fields
          </h2>
          <p className="mt-1 text-sm leading-6 text-content-muted">
            Choose the information each record should contain. Use clear names such as customerName or
            invoice_total.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border-strong px-2.5 py-1 text-xs font-medium tabular-nums text-content-muted">
          {fields.length}/{REQUEST_LIMITS.fieldsMaxCount}
        </span>
      </div>

      {fields.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-surface-inset px-5 py-10 text-center">
          <div
            aria-hidden="true"
            className="mx-auto grid size-10 place-items-center rounded-full bg-surface-raised text-content-muted"
          >
            <Plus className="size-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-content">No fields yet</h3>
          <p className="mt-2 text-sm leading-6 text-content-muted">
            Start with the information every record should include.
          </p>
          <button
            className="mx-auto mt-4 flex h-10 items-center gap-2 rounded-xl bg-button px-4 text-sm font-semibold text-content transition hover:bg-action/15 hover:text-action"
            id="add-first-field-button"
            onClick={onAddField}
            type="button"
          >
            Add your first field
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : (
        <div className="@container mt-6 overflow-hidden rounded-xl border border-border bg-surface">
          <div
            aria-hidden="true"
            className={`hidden border-b border-border px-3 py-2 text-xs font-medium text-content-muted @xl:grid ${FIELD_ROW_GAP} ${FIELD_ROW_COLUMNS}`}
          >
            <span />
            <span>Field name</span>
            <span>Type</span>
            <span className="text-center">Nullable</span>
          </div>
          <ul className="divide-y divide-border">
            {fields.map((field, index) => (
              <li key={field.id}>
                <FieldEditor
                  field={field}
                  index={index}
                  invalid={invalidIndexes.has(index)}
                  problemsId={FIELD_PROBLEMS_ID}
                  issues={getFieldValidationIssues(validationIssues, index)}
                  onRemove={() => onRemoveField(index)}
                  onUpdate={(updates) => onUpdateField(index, updates)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export { FieldBuilderPanel };
