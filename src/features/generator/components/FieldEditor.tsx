import { Trash2 } from 'lucide-react';
import {
  FIELD_TYPES,
  REQUEST_LIMITS,
  type FieldType,
  type ValidationIssue,
} from '../../../lib/generation';
import { getFieldInputId, type FieldDraft, type FieldValidationIssues } from '../field-utils';

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  string: 'Text',
  number: 'Decimal number',
  integer: 'Whole number',
  boolean: 'True / false',
};

const inputClassName =
  'mt-1.5 block h-10.5 w-full rounded-lg border border-border-strong bg-input px-3 py-2 text-sm text-content outline-none placeholder:text-content-muted/70 focus:border-focus focus:ring-4 focus:ring-focus/30';

type FieldEditorProps = {
  field: FieldDraft;
  index: number;
  issues: FieldValidationIssues;
  onRemove: () => void;
  onUpdate: (updates: Partial<FieldDraft>) => void;
};

function FieldIssues({ issues }: { issues: ValidationIssue[] }) {
  return issues.map((issue) => (
    <p key={issue.message} className="mt-1.5 text-xs leading-5 text-danger">
      {issue.message}
    </p>
  ));
}

function FieldEditor({ field, index, issues, onRemove, onUpdate }: FieldEditorProps) {
  const nameInputId = getFieldInputId(field.id, 'name');
  const typeInputId = getFieldInputId(field.id, 'type');
  const guidanceInputId = getFieldInputId(field.id, 'guidance');
  const nullableInputId = getFieldInputId(field.id, 'nullable');

  return (
    <fieldset className="rounded-xl border border-border bg-surface-inset p-4">
      <legend className="sr-only">Field {index + 1}</legend>

      {/* Container queries: the grid follows the width of the pane, not the viewport. */}
      <div className="@container">
        <div className="grid gap-x-4 gap-y-4 @sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)] @3xl:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_minmax(0,1.5fr)]">
          <div>
            <label
              htmlFor={nameInputId}
              className="block whitespace-nowrap text-xs font-medium text-content"
            >
              <span aria-hidden="true" className="mr-1.5 text-content-muted">
                {index + 1}.
              </span>
              Field name
            </label>
            <input
              id={nameInputId}
              maxLength={REQUEST_LIMITS.fieldNameMaxLength}
              value={field.name}
              onChange={(event) => onUpdate({ name: event.target.value })}
              aria-invalid={issues.name.length > 0}
              className={inputClassName}
            />
            <FieldIssues issues={issues.name} />
          </div>

          <div>
            <label htmlFor={typeInputId} className="block text-xs font-medium text-content">
              Type
            </label>
            <select
              id={typeInputId}
              value={field.type}
              onChange={(event) => onUpdate({ type: event.target.value as FieldType })}
              aria-invalid={issues.type.length > 0}
              className={inputClassName}
            >
              {FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {FIELD_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <FieldIssues issues={issues.type} />
          </div>

          <div className="@sm:col-span-2 @3xl:col-span-1">
            <label htmlFor={guidanceInputId} className="block text-xs font-medium text-content">
              Guidance <span className="font-normal text-content-muted">(optional)</span>
            </label>
            <input
              id={guidanceInputId}
              maxLength={REQUEST_LIMITS.fieldGuidanceMaxLength}
              placeholder="For example: use a work email address"
              value={field.guidance ?? ''}
              onChange={(event) => onUpdate({ guidance: event.target.value })}
              aria-invalid={issues.guidance.length > 0}
              className={inputClassName}
            />
            <FieldIssues issues={issues.guidance} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <label
            htmlFor={nullableInputId}
            className="flex cursor-pointer items-center gap-2.5 text-sm text-content"
          >
            <input
              id={nullableInputId}
              checked={field.nullable}
              onChange={(event) => onUpdate({ nullable: event.target.checked })}
              type="checkbox"
              className="size-4 accent-action"
            />
            Allow null values
          </label>
          <FieldIssues issues={issues.nullable} />
        </div>
        <button
          className="grid size-9 place-items-center rounded-lg text-content-muted transition hover:text-danger"
          aria-label={`Remove field ${index + 1}`}
          onClick={onRemove}
          title="Remove field"
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </fieldset>
  );
}

export { FieldEditor };
