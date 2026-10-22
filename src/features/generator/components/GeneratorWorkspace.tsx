import { useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { generate } from '../../../lib/generate';
import {
  REQUEST_LIMITS,
  validateGenerateRequest,
  type GenerationState,
  type ValidationIssue,
} from '../../../lib/generation';
import type { MockOutcome } from '../../../lib/mock-generator';
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
import { MockOutcomeControl } from './MockOutcomeControl';
import { ResultsPanel } from './ResultsPanel';

function GeneratorWorkspace() {
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [recordCount, setRecordCount] = useState('10');
  const [generation, setGeneration] = useState<GenerationState>({ status: 'idle' });
  const [mockOutcome, setMockOutcome] = useState<MockOutcome>('success');
  const [touched, setTouched] = useState<ReadonlySet<TouchedSection>>(new Set());
  const requestValidation = validateGenerateRequest(
    buildGenerateRequest(description, recordCount, fields),
  );
  const isLoading = generation.status === 'loading';
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!requestValidation.valid || isLoading) {
      return;
    }

    setGeneration({ status: 'loading' });

    try {
      const response = await generate(requestValidation.data, { mockOutcome });

      setGeneration(
        'error' in response
          ? { status: 'error', error: response.error }
          : { status: 'success', result: response },
      );
    } catch {
      setGeneration({
        status: 'error',
        error: {
          code: 'UPSTREAM_ERROR',
          message: 'Something went wrong while generating data. Please try again.',
        },
      });
    }
  }

  return (
    <div className="mt-10 space-y-6 lg:mt-12">
      <form
        aria-labelledby="dataset-setup-heading"
        className="space-y-6"
        noValidate
        onSubmit={handleSubmit}
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
            disabled={!requestValidation.valid || isLoading}
            type="submit"
          >
            {isLoading ? 'Generating…' : 'Generate data'}
          </button>
          <p className="mt-3 text-xs leading-5 text-content-muted">
            {requestValidation.valid
              ? 'Ready to generate.'
              : 'Add a description and at least one valid field to continue.'}
          </p>
          {import.meta.env.DEV && (
            <MockOutcomeControl outcome={mockOutcome} onChange={setMockOutcome} />
          )}
          {getIssues('request').map((issue) => (
            <p key={issue.message} className="mt-2 text-xs text-danger">
              {issue.message}
            </p>
          ))}
        </div>
      </form>
      <ResultsPanel state={generation} />
    </div>
  );
}

export { GeneratorWorkspace };
