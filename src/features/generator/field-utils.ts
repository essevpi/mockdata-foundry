import type { FieldDefinition, ValidationIssue } from '../../lib/generation';

export type FieldValidationIssues = {
  guidance: ValidationIssue[];
  name: ValidationIssue[];
  nullable: ValidationIssue[];
  type: ValidationIssue[];
};

export function getNextFieldName(fields: FieldDefinition[]) {
  let suffix = fields.length + 1;

  while (fields.some((field) => field.name === `field${suffix}`)) {
    suffix += 1;
  }

  return `field${suffix}`;
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
