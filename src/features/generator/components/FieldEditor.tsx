import { ChevronDown, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  FIELD_TYPES,
  REQUEST_LIMITS,
  type FieldType,
  type ValidationIssue,
} from '../../../lib/generation';
import { getFieldInputId, type FieldDraft, type FieldValidationIssues } from '../field-utils';
import { FIELD_ROW_COLUMNS, FIELD_ROW_GAP } from '../field-row-layout';

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  string: 'Text',
  number: 'Decimal number',
  integer: 'Whole number',
  boolean: 'True / false',
};

const inputClassName =
  'block h-10 w-full rounded-lg border border-border-strong bg-input px-3 text-sm text-content outline-none placeholder:text-content-muted/70 focus:border-focus focus:ring-4 focus:ring-focus/30 @xl:h-9';

// Labels stay for screen readers; sighted users get the header row (wide) or the field itself.
const labelClassName = 'sr-only';

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

// One field as a row. The list container (see FieldBuilderPanel) is the query container: wide
// rows fit on one line, narrow ones wrap to name + type, then nullable / guidance / remove.
function FieldEditor({ field, index, issues, onRemove, onUpdate }: FieldEditorProps) {
  const nameInputId = getFieldInputId(field.id, 'name');
  const typeInputId = getFieldInputId(field.id, 'type');
  const guidanceInputId = getFieldInputId(field.id, 'guidance');
  const nullableInputId = getFieldInputId(field.id, 'nullable');
  const [guidanceToggled, setGuidanceToggled] = useState(Boolean(field.guidance));
  const [openedByUser, setOpenedByUser] = useState(false);
  const guidanceOpen = guidanceToggled || issues.guidance.length > 0;

  function toggleGuidance() {
    setOpenedByUser(!guidanceOpen);
    setGuidanceToggled(!guidanceOpen);
  }

  return (
    <fieldset className="px-3 py-3 @xl:py-2">
      <legend className="sr-only">Field {index + 1}</legend>

      <div
        className={`grid grid-cols-[minmax(0,1fr)_minmax(0,9.5rem)] items-start gap-y-3 ${FIELD_ROW_GAP} ${FIELD_ROW_COLUMNS} @xl:gap-y-2`}
      >
        <span
          aria-hidden="true"
          className="hidden text-right text-xs tabular-nums text-content-muted @xl:block @xl:pt-2.5"
        >
          {index + 1}
        </span>

        <div>
          <label htmlFor={nameInputId} className={labelClassName}>
            Field name
          </label>
          <input
            id={nameInputId}
            maxLength={REQUEST_LIMITS.fieldNameMaxLength}
            placeholder="Field name"
            value={field.name}
            onChange={(event) => onUpdate({ name: event.target.value })}
            aria-invalid={issues.name.length > 0}
            className={inputClassName}
          />
          <FieldIssues issues={issues.name} />
        </div>

        <div>
          <label htmlFor={typeInputId} className={labelClassName}>
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

        {/* Wide rows: this wrapper disappears and its children become cells of the row grid. */}
        <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 @xl:contents">
          <div className="@xl:col-start-4 @xl:flex @xl:h-9 @xl:items-center @xl:justify-center">
            <label
              htmlFor={nullableInputId}
              className="flex cursor-pointer items-center gap-2 text-sm text-content"
            >
              <input
                id={nullableInputId}
                checked={field.nullable}
                onChange={(event) => onUpdate({ nullable: event.target.checked })}
                type="checkbox"
                className="size-4 accent-action"
              />
              <span className="@xl:sr-only">Nullable</span>
            </label>
            <FieldIssues issues={issues.nullable} />
          </div>

          <button
            aria-controls={guidanceOpen ? guidanceInputId : undefined}
            aria-expanded={guidanceOpen}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-content-muted transition hover:bg-action/15 hover:text-action @xl:col-start-5 @xl:justify-self-start"
            onClick={toggleGuidance}
            type="button"
          >
            <ChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform motion-reduce:transition-none ${
                guidanceOpen ? '' : '-rotate-90'
              }`}
            />
            Guidance
            {!guidanceOpen && field.guidance && (
              <>
                <span aria-hidden="true" className="size-1.5 rounded-full bg-action" />
                <span className="sr-only">(has text)</span>
              </>
            )}
          </button>

          <button
            aria-label={`Remove field ${index + 1}`}
            className="ml-auto flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-content-muted transition hover:bg-danger/10 hover:text-danger @xl:col-start-6 @xl:ml-0 @xl:size-9 @xl:justify-center @xl:px-0"
            onClick={onRemove}
            title="Remove field"
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            <span className="hidden @sm:inline @xl:sr-only">Remove</span>
          </button>

          {guidanceOpen && (
            <div className="order-last basis-full @xl:col-span-5 @xl:col-start-2 @xl:row-start-2">
              <label htmlFor={guidanceInputId} className="sr-only">
                Guidance (optional)
              </label>
              <input
                id={guidanceInputId}
                autoFocus={openedByUser}
                maxLength={REQUEST_LIMITS.fieldGuidanceMaxLength}
                placeholder="Guidance, for example: use a work email address"
                value={field.guidance ?? ''}
                onChange={(event) => onUpdate({ guidance: event.target.value })}
                aria-invalid={issues.guidance.length > 0}
                className={inputClassName}
              />
              <FieldIssues issues={issues.guidance} />
            </div>
          )}
        </div>
      </div>
    </fieldset>
  );
}

export { FieldEditor };
