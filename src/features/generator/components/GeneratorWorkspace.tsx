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
import { GenerateBar } from './GenerateBar';
import { PourLine } from './PourLine';
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

    const request = requestValidation.data;

    setGeneration({ status: 'loading' });

    try {
      const response = await generate(request, { mockOutcome });

      setGeneration(
        'error' in response
          ? { status: 'error', error: response.error }
          : {
              status: 'success',
              result: response,
              columns: request.fields.map((field) => field.name),
            },
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
    <div className="relative flex min-w-0 flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
      {/* Below lg the form is display: contents so the sticky Generate bar's containing block is
          the whole stacked workspace and it stays visible over the results too. */}
      <form
        aria-labelledby="dataset-setup-heading"
        className="contents lg:flex lg:min-h-0 lg:min-w-0 lg:flex-col lg:border-r lg:border-border-strong"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="space-y-6 p-4 sm:p-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
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
        </div>
        <GenerateBar
          isLoading={isLoading}
          isValid={requestValidation.valid}
          mockOutcome={mockOutcome}
          requestIssues={getIssues('request')}
          onMockOutcomeChange={setMockOutcome}
        />
      </form>
      <PourLine active={isLoading} axis="y" className="inset-y-0 left-1/2 -ml-0.5 hidden w-0.5 lg:block" />
      <div className="flex min-w-0 flex-col p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto">
        <ResultsPanel state={generation} />
      </div>
    </div>
  );
}

export { GeneratorWorkspace };
