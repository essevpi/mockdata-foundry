import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import { flushSync } from 'react-dom';
import { generate, type GeneratorSource } from '../../../lib/generate';
import {
  REQUEST_LIMITS,
  validateGenerateRequest,
  type GenerationState,
  type ValidationIssue,
} from '../../../lib/generation';
import type { MockOutcome } from '../../../lib/mock-generator';
import { getLocalStorage } from '../../../lib/storage';
import {
  buildGenerateRequest,
  DEFAULT_RECORD_COUNT,
  FORM_RESET_BUTTON_ID,
  createFieldDraft,
  createFieldDraftFromDefinition,
  getFieldInputId,
  getFocusTargetIdAfterRemoval,
  getVisibleIssues,
  isFormBlank,
  summarizeFieldIssues,
  type FieldDraft,
  type TouchedSection,
} from '../field-utils';
import { readStoredGeneratorSource, storeGeneratorSource } from '../generator-source';
import { createErrorState, getNoResponseMessage } from '../result-utils';
import type { Preset } from '../presets';
import { CommandBar } from './CommandBar';
import { DatasetDetailsPanel } from './DatasetDetailsPanel';
import { DevTools } from './DevTools';
import { ExamplePresets } from './ExamplePresets';
import { FormResetButton } from './FormResetButton';
import { FieldBuilderPanel } from './FieldBuilderPanel';
import { PourLine } from './PourLine';
import { ResultsPanel } from './ResultsPanel';

type ClearedForm = {
  description: string;
  fields: FieldDraft[];
  recordCount: string;
};

function GeneratorWorkspace() {
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [recordCount, setRecordCount] = useState(DEFAULT_RECORD_COUNT);
  const [generation, setGeneration] = useState<GenerationState>({ status: 'idle' });
  // Development builds only (DevTools); production always uses the API.
  const [source, setSource] = useState<GeneratorSource>(() =>
    import.meta.env.DEV ? readStoredGeneratorSource(getLocalStorage()) : 'api',
  );
  const [mockOutcome, setMockOutcome] = useState<MockOutcome>('success');
  const [touched, setTouched] = useState<ReadonlySet<TouchedSection>>(new Set());
  // What Clear form removed, kept until the form gets new content so Undo can restore it.
  const [clearedForm, setClearedForm] = useState<ClearedForm | null>(null);
  const [resetAnnouncement, setResetAnnouncement] = useState('');
  const isBlank = isFormBlank(description, fields);
  const requestValidation = validateGenerateRequest(
    buildGenerateRequest(description, recordCount, fields),
  );
  const isLoading = generation.status === 'loading';
  const validationIssues = requestValidation.valid
    ? []
    : getVisibleIssues(requestValidation.issues, touched);

  const fieldProblems = summarizeFieldIssues(validationIssues, fields);
  const paneRef = useRef<HTMLDivElement>(null);
  const problemCount =
    fieldProblems.length + getIssues('fields').length + getIssues('request').length;

  // While the problem tray is showing the pane gets room below the list (instantly, so the field
  // being edited can scroll above the tray); the room collapses smoothly when the problems clear.
  useEffect(() => {
    const active = document.activeElement;

    if (problemCount > 0 && active instanceof HTMLElement && paneRef.current?.contains(active)) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }, [problemCount]);

  function getIssues(field: string): ValidationIssue[] {
    return validationIssues.filter((issue) => issue.field === field);
  }

  function markTouched(section: TouchedSection) {
    setTouched((currentTouched) =>
      currentTouched.has(section) ? currentTouched : new Set(currentTouched).add(section),
    );
  }

  // Once the form has new content the cleared one can no longer be restored.
  function dropClearedForm() {
    setClearedForm(null);
    setResetAnnouncement('');
  }

  function changeSource(nextSource: GeneratorSource) {
    storeGeneratorSource(getLocalStorage(), nextSource);
    setSource(nextSource);
  }

  function changeDescription(nextDescription: string) {
    dropClearedForm();
    setDescription(nextDescription);
  }

  function clearForm() {
    flushSync(() => {
      setClearedForm({ description, fields, recordCount });
      setResetAnnouncement('Form cleared.');
      setDescription('');
      setRecordCount(DEFAULT_RECORD_COUNT);
      setFields([]);
      setTouched(new Set());
    });

    // The same button now offers Undo, so focus normally stays on it already.
    document.getElementById(FORM_RESET_BUTTON_ID)?.focus();
  }

  function undoClear() {
    if (!clearedForm) {
      return;
    }

    flushSync(() => {
      setDescription(clearedForm.description);
      setRecordCount(clearedForm.recordCount);
      setFields(clearedForm.fields);
      setTouched(new Set());
      setClearedForm(null);
      setResetAnnouncement('Form restored.');
    });

    document.getElementById(FORM_RESET_BUTTON_ID)?.focus();
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

    const draft = createFieldDraft(fields);

    dropClearedForm();
    markTouched('fields');
    flushSync(() => {
      setFields((currentFields) => [...currentFields, draft]);
    });

    // The Add button lives in the command bar, so bring the new row into view and start typing.
    const nameInput = document.getElementById(getFieldInputId(draft.id, 'name'));

    nameInput?.scrollIntoView({ block: 'nearest' });
    nameInput?.focus();
  }

  function removeField(index: number) {
    const focusTargetId = getFocusTargetIdAfterRemoval(fields, index);

    markTouched('fields');
    flushSync(() => {
      setFields((currentFields) => currentFields.filter((_, fieldIndex) => fieldIndex !== index));
    });
    document.getElementById(focusTargetId)?.focus();
  }

  function applyPreset(preset: Preset) {
    flushSync(() => {
      dropClearedForm();
      setDescription(preset.description);
      setRecordCount(preset.recordCount);
      setFields(preset.fields.map(createFieldDraftFromDefinition));
      setTouched(new Set());
    });

    // The preset buttons are gone now; continue in the description with the caret at the end.
    const descriptionInput = document.getElementById('description');

    if (descriptionInput instanceof HTMLTextAreaElement) {
      descriptionInput.focus();
      descriptionInput.setSelectionRange(preset.description.length, preset.description.length);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!requestValidation.valid || isLoading) {
      return;
    }

    const request = requestValidation.data;

    setGeneration({ status: 'loading' });

    try {
      const response = await generate(request, { source, mockOutcome });

      setGeneration(
        'error' in response
          ? createErrorState(response.error)
          : {
              status: 'success',
              result: response,
              columns: request.fields.map((field) => field.name),
            },
      );
    } catch (error) {
      setGeneration(
        createErrorState({ code: 'UPSTREAM_ERROR', message: getNoResponseMessage(error) }),
      );
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
        <div
          ref={paneRef}
          className={`scroll-pb-32 space-y-6 p-4 sm:p-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto ${
            problemCount > 0
              ? 'lg:pb-32'
              : 'transition-[padding] duration-200 motion-reduce:transition-none'
          }`}
        >
          <DatasetDetailsPanel
            belowDescription={
              <AnimatePresence initial={false}>
                {isBlank && <ExamplePresets key="presets" onApply={applyPreset} />}
              </AnimatePresence>
            }
            headerAction={
              <FormResetButton
                announcement={resetAnnouncement}
                canUndo={clearedForm !== null}
                isBlank={isBlank}
                onClear={clearForm}
                onUndo={undoClear}
              />
            }
            countIssues={getIssues('count')}
            description={description}
            descriptionIssues={getIssues('description')}
            recordCount={recordCount}
            onCountBlur={() => markTouched('count')}
            onDescriptionBlur={() => markTouched('description')}
            onDescriptionChange={changeDescription}
            onRecordCountChange={setRecordCount}
          />
          <FieldBuilderPanel
            fields={fields}
            problems={fieldProblems}
            validationIssues={validationIssues}
            onAddField={addField}
            onRemoveField={removeField}
            onUpdateField={updateField}
          />
        </div>
        <CommandBar
          atFieldLimit={fields.length >= REQUEST_LIMITS.fieldsMaxCount}
          fieldIssues={getIssues('fields')}
          fieldProblems={fieldProblems}
          fields={fields}
          isLoading={isLoading}
          isValid={requestValidation.valid}
          requestIssues={getIssues('request')}
          onAddField={addField}
        />
      </form>
      {import.meta.env.DEV && (
        <DevTools
          outcome={mockOutcome}
          source={source}
          onOutcomeChange={setMockOutcome}
          onSourceChange={changeSource}
        />
      )}
      <PourLine active={isLoading} axis="y" className="inset-y-0 left-1/2 -ml-0.5 hidden w-0.5 lg:block" />
      <div className="flex min-w-0 flex-col border-t border-border-strong bg-surface p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto lg:border-t-0 lg:bg-transparent">
        <ResultsPanel state={generation} />
      </div>
    </div>
  );
}

export { GeneratorWorkspace };
