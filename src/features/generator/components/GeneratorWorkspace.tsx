import { useState } from 'react';
import {
  REQUEST_LIMITS,
  validateGenerateRequest,
  type FieldDefinition,
  type ValidationIssue,
} from '../../../lib/generation';
import { getNextFieldName } from '../field-utils';
import { DatasetDetailsPanel } from './DatasetDetailsPanel';
import { FieldBuilderPanel } from './FieldBuilderPanel';

function GeneratorWorkspace() {
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [recordCount, setRecordCount] = useState('10');
  const requestValidation = validateGenerateRequest({
    description,
    count: Number(recordCount),
    fields,
  });
  const validationIssues = requestValidation.valid ? [] : requestValidation.issues;

  function getIssues(field: string): ValidationIssue[] {
    return validationIssues.filter((issue) => issue.field === field);
  }

  function updateField(index: number, updates: Partial<FieldDefinition>) {
    setFields((currentFields) =>
      currentFields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...updates } : field,
      ),
    );
  }

  function addField() {
    setFields((currentFields) => {
      if (currentFields.length === REQUEST_LIMITS.fieldsMaxCount) {
        return currentFields;
      }

      return [
        ...currentFields,
        {
          name: getNextFieldName(currentFields),
          type: 'string',
          nullable: false,
        },
      ];
    });
  }

  function removeField(index: number) {
    setFields((currentFields) => currentFields.filter((_, fieldIndex) => fieldIndex !== index));
  }

  return (
    <section
      aria-labelledby="dataset-setup-heading"
      className="mt-10 grid gap-6 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <DatasetDetailsPanel
        countIssues={getIssues('count')}
        description={description}
        descriptionIssues={getIssues('description')}
        recordCount={recordCount}
        onDescriptionChange={setDescription}
        onRecordCountChange={setRecordCount}
      />
      <FieldBuilderPanel
        fields={fields}
        validationIssues={validationIssues}
        onAddField={addField}
        onRemoveField={removeField}
        onUpdateField={updateField}
      />
    </section>
  );
}

export { GeneratorWorkspace };
