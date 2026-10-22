import {
  REQUEST_LIMITS,
  type FieldDefinition,
  type FieldType,
} from '../../../lib/generation';
import type { FieldValidationIssues } from '../field-utils';

type FieldEditorProps = {
  field: FieldDefinition;
  index: number;
  issues: FieldValidationIssues;
  onRemove: () => void;
  onUpdate: (updates: Partial<FieldDefinition>) => void;
};

function FieldEditor({ field, index, issues, onRemove, onUpdate }: FieldEditorProps) {
  const nameInputId = `field-${index}-name`;
  const typeInputId = `field-${index}-type`;
  const guidanceInputId = `field-${index}-guidance`;
  const nullableInputId = `field-${index}-nullable`;

  return (
    <fieldset className="rounded-xl border border-border bg-surface-inset/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-content-muted">
          Field {index + 1}
        </legend>
        <button
          className="text-xs font-medium text-content-muted underline decoration-border underline-offset-4 transition hover:text-danger"
          onClick={onRemove}
          type="button"
        >
          Remove
        </button>
      </div>

      <label htmlFor={nameInputId} className="mt-4 block text-xs font-medium text-content">
        Field name
      </label>
      <input
        id={nameInputId}
        maxLength={REQUEST_LIMITS.fieldNameMaxLength}
        value={field.name}
        onChange={(event) => onUpdate({ name: event.target.value })}
        aria-invalid={issues.name.length > 0}
        className="mt-1.5 block w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-content outline-none focus:border-focus focus:ring-4 focus:ring-focus/15"
      />
      {issues.name.map((issue) => (
        <p key={issue.message} className="mt-1.5 text-xs leading-5 text-danger">
          {issue.message}
        </p>
      ))}

      <label htmlFor={typeInputId} className="mt-4 block text-xs font-medium text-content">
        Type
      </label>
      <select
        id={typeInputId}
        value={field.type}
        onChange={(event) => onUpdate({ type: event.target.value as FieldType })}
        aria-invalid={issues.type.length > 0}
        className="mt-1.5 block w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-content outline-none focus:border-focus focus:ring-4 focus:ring-focus/15"
      >
        <option value="string">Text</option>
        <option value="number">Number</option>
        <option value="integer">Whole number</option>
        <option value="boolean">True / false</option>
      </select>
      {issues.type.map((issue) => (
        <p key={issue.message} className="mt-1.5 text-xs leading-5 text-danger">
          {issue.message}
        </p>
      ))}

      <label
        htmlFor={nullableInputId}
        className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface/70 px-3 py-2.5 text-sm text-content"
      >
        <input
          id={nullableInputId}
          checked={field.nullable}
          onChange={(event) => onUpdate({ nullable: event.target.checked })}
          type="checkbox"
          className="size-4 rounded border-border bg-input text-action focus:ring-focus"
        />
        Allow null values
      </label>
      {issues.nullable.map((issue) => (
        <p key={issue.message} className="mt-1.5 text-xs leading-5 text-danger">
          {issue.message}
        </p>
      ))}

      <label htmlFor={guidanceInputId} className="mt-4 block text-xs font-medium text-content">
        Field guidance <span className="font-normal text-content-muted">(optional)</span>
      </label>
      <input
        id={guidanceInputId}
        maxLength={REQUEST_LIMITS.fieldGuidanceMaxLength}
        placeholder="For example: use a work email address"
        value={field.guidance ?? ''}
        onChange={(event) => onUpdate({ guidance: event.target.value })}
        aria-invalid={issues.guidance.length > 0}
        className="mt-1.5 block w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-content outline-none placeholder:text-content-muted/70 focus:border-focus focus:ring-4 focus:ring-focus/15"
      />
      {issues.guidance.map((issue) => (
        <p key={issue.message} className="mt-1.5 text-xs leading-5 text-danger">
          {issue.message}
        </p>
      ))}
    </fieldset>
  );
}

export { FieldEditor };
