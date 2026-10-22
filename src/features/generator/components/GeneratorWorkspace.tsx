import { useState } from 'react';
import { flushSync } from 'react-dom';
import {
  REQUEST_LIMITS,
  validateGenerateRequest,
  type ValidationIssue,
} from '../../../lib/generation';
import {
  buildGenerateRequest,
  createFieldDraft,
  getFocusTargetIdAfterRemoval,
  getVisibleIssues,
  type FieldDraft,
  type TouchedSection,
} from '../field-utils';
import { DatasetDetailsPanel } from './DatasetDetailsPanel';
import { FieldBuilderPanel } from './FieldBuilderPanel';

function GeneratorWorkspace() {
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [recordCount, setRecordCount] = useState('10');
  const [touched, setTouched] = useState<ReadonlySet<TouchedSection>>(new Set());
  const requestValidation = validateGenerateRequest(
    buildGenerateRequest(description, recordCount, fields),
  );
  const validationIssues = requestValidation.valid
    ? []
    : getVisibleIssues(requestValidation.issues, touched);

  function getIssues(field: string): ValidationIssue[] {
    return validationIssues.filter((issue) => issue.field === field);
  }

  function markTouched(section: TouchedSection) {
    setTouched((currentTouched) =>
      currentTouched.has(section) ? currentTouched : new Set(currentTouched).add(section),
    );
  }

  function updateField(index: number, updates: Partial<FieldDraft>) {
    markTouched('fields');
    setFields((currentFields) =>
      currentFields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...updates } : field,
      ),
    );
  }

  function addField() {
    if (fields.length >= REQUEST_LIMITS.fieldsMaxCount) {
      return;
    }

    markTouched('fields');
    setFields((currentFields) => [...currentFields, createFieldDraft(currentFields)]);
  }

  function removeField(index: number) {
    const focusTargetId = getFocusTargetIdAfterRemoval(fields, index);

    markTouched('fields');
    flushSync(() => {
      setFields((currentFields) => currentFields.filter((_, fieldIndex) => fieldIndex !== index));
    });
    document.getElementById(focusTargetId)?.focus();
  }

  return (
    <form
      aria-labelledby="dataset-setup-heading"
      className="mt-10 space-y-6 lg:mt-12"
      noValidate
      onSubmit={(event) => event.preventDefault()}
    >
      <DatasetDetailsPanel
        countIssues={getIssues('count')}
        description={description}
        descriptionIssues={getIssues('description')}
        recordCount={recordCount}
        onCountBlur={() => markTouched('count')}
        onDescriptionBlur={() => markTouched('description')}
        onDescriptionChange={setDescription}
        onRecordCountChange={setRecordCount}
      />
      <FieldBuilderPanel
        fields={fields}
        fieldsIssues={getIssues('fields')}
        validationIssues={validationIssues}
        onAddField={addField}
        onRemoveField={removeField}
        onUpdateField={updateField}
      />
      <div>
        <button
          className="w-full rounded-xl bg-action px-4 py-3 text-sm font-semibold text-action-foreground transition hover:bg-action-hover disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-content-muted sm:w-auto sm:px-8"
          disabled={!requestValidation.valid}
          type="submit"
        >
          Generate data
        </button>
        <p className="mt-3 text-xs leading-5 text-content-muted">
          {requestValidation.valid
            ? 'Ready to generate.'
            : 'Add a description and at least one valid field to continue.'}
        </p>
        {getIssues('request').map((issue) => (
          <p key={issue.message} className="mt-2 text-xs text-danger">
            {issue.message}
          </p>
        ))}
      </div>
    </form>
  );
}

export { GeneratorWorkspace };
