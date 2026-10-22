import type {
  FieldDefinition,
  GenerateRequest,
  ValidationIssue,
} from '../../lib/generation';

export type FieldDraft = FieldDefinition & { id: string };

export type TouchedSection = 'count' | 'description' | 'fields';

export type FieldValidationIssues = {
  guidance: ValidationIssue[];
  name: ValidationIssue[];
  nullable: ValidationIssue[];
  type: ValidationIssue[];
};

export const ADD_FIELD_BUTTON_ID = 'add-field-button';

let nextFieldId = 0;

export function getFieldInputId(fieldId: string, input: 'guidance' | 'name' | 'nullable' | 'type') {
  return `${fieldId}-${input}`;
}

export function getFocusTargetIdAfterRemoval(fields: FieldDraft[], removedIndex: number) {
  const neighbour = fields[removedIndex + 1] ?? fields[removedIndex - 1];

  return neighbour ? getFieldInputId(neighbour.id, 'name') : ADD_FIELD_BUTTON_ID;
}

export function createFieldDraft(existingFields: FieldDraft[]): FieldDraft {
  nextFieldId += 1;

  return {
    id: `field-${nextFieldId}`,
    name: getNextFieldName(existingFields),
    type: 'string',
    nullable: false,
  };
}

export function getNextFieldName(fields: FieldDefinition[]) {
  let suffix = fields.length + 1;

  while (fields.some((field) => field.name === `field${suffix}`)) {
    suffix += 1;
  }

  return `field${suffix}`;
}

export function buildGenerateRequest(
  description: string,
  recordCount: string,
  fields: FieldDraft[],
): GenerateRequest {
  return {
    description,
    count: Number(recordCount),
    fields: fields.map(({ guidance, name, nullable, type }) => ({
      name,
      type,
      nullable,
      ...(guidance ? { guidance } : {}),
    })),
  };
}

export function getVisibleIssues(
  issues: ValidationIssue[],
  touched: ReadonlySet<TouchedSection>,
): ValidationIssue[] {
  return issues.filter((issue) => {
    if (issue.field === 'description' || issue.field === 'count') {
      return touched.has(issue.field);
    }

    if (issue.field === 'fields' || issue.field.startsWith('fields[')) {
      return touched.has('fields');
    }

    return true;
  });
}

export function getFieldValidationIssues(
  validationIssues: ValidationIssue[],
  index: number,
): FieldValidationIssues {
  const fieldPath = `fields[${index}]`;

  return {
    name: validationIssues.filter((issue) => issue.field === `${fieldPath}.name`),
    type: validationIssues.filter((issue) => issue.field === `${fieldPath}.type`),
    nullable: validationIssues.filter((issue) => issue.field === `${fieldPath}.nullable`),
    guidance: validationIssues.filter((issue) => issue.field === `${fieldPath}.guidance`),
  };
}
