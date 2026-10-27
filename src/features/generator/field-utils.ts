import {
  DUPLICATE_FIELD_NAME_MESSAGE,
  REQUEST_LIMITS,
  type FieldDefinition,
  type GenerateRequest,
  type ValidationIssue,
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
export const FIELD_PROBLEMS_ID = 'field-problems';

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

// Steps the record count text by one, clamped to the request limits. Empty or invalid text
// steps to the minimum; a fractional value steps to the next whole number in that direction.
export function stepRecordCount(recordCount: string, delta: 1 | -1): string {
  const value = Number(recordCount);
  const { recordsMaxCount, recordsMinCount } = REQUEST_LIMITS;

  if (recordCount.trim() === '' || !Number.isFinite(value)) {
    return String(recordsMinCount);
  }

  const stepped = delta > 0 ? Math.floor(value) + 1 : Math.ceil(value) - 1;

  return String(Math.min(recordsMaxCount, Math.max(recordsMinCount, stepped)));
}

export function canStepRecordCount(recordCount: string, delta: 1 | -1): boolean {
  return Number(stepRecordCount(recordCount, delta)) !== Number(recordCount);
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

export type FieldProblem = {
  message: string;
  // 1-based field numbers, in ascending order.
  fieldNumbers: number[];
};

const FIELD_ISSUE_PATH = /^fields\[(\d+)\]\./;

// Groups per-field validation issues by message so the builder can show one shared message per
// problem. Validation only flags the second and later fields that share a name, so for the
// duplicate-name message every field with that name is included.
export function summarizeFieldIssues(
  issues: ValidationIssue[],
  fields: Array<Pick<FieldDefinition, 'name'>>,
): FieldProblem[] {
  const numbersByMessage = new Map<string, Set<number>>();

  for (const issue of issues) {
    const match = FIELD_ISSUE_PATH.exec(issue.field);

    if (!match) {
      continue;
    }

    const numbers = numbersByMessage.get(issue.message) ?? new Set<number>();

    numbers.add(Number(match[1]) + 1);
    numbersByMessage.set(issue.message, numbers);
  }

  const duplicateNumbers = numbersByMessage.get(DUPLICATE_FIELD_NAME_MESSAGE);

  if (duplicateNumbers) {
    const duplicateNames = new Set(
      [...duplicateNumbers].map((fieldNumber) => fields[fieldNumber - 1]?.name),
    );

    fields.forEach((field, index) => {
      if (duplicateNames.has(field.name)) {
        duplicateNumbers.add(index + 1);
      }
    });
  }

  return [...numbersByMessage].map(([message, numbers]) => ({
    message,
    fieldNumbers: [...numbers].sort((a, b) => a - b),
  }));
}

// "Field 1", "Field 1 and Field 2", "Field 1, Field 2 and Field 4".
export function formatFieldReference(fieldNumbers: number[]): string {
  const labels = fieldNumbers.map((fieldNumber) => `Field ${fieldNumber}`);

  if (labels.length <= 1) {
    return labels.join('');
  }

  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

// One shared sentence per problem, for example "Field names must be unique (Field 1 and Field 2)."
export function formatFieldProblem(problem: FieldProblem): string {
  return `${problem.message.replace(/\.$/, '')} (${formatFieldReference(problem.fieldNumbers)}).`;
}

// Zero-based indexes of every field named in a problem, for highlighting rows.
export function getInvalidFieldIndexes(problems: FieldProblem[]): Set<number> {
  return new Set(problems.flatMap((problem) => problem.fieldNumbers.map((number) => number - 1)));
}
