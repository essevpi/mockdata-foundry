import { describe, expect, it } from 'vitest';
import {
  REQUEST_LIMITS,
  validateGenerateRequest,
  type FieldDefinition,
  type GenerateRequest,
} from './generation';

const validField: FieldDefinition = { name: 'email', type: 'string', nullable: false };

function buildRequest(overrides: Partial<GenerateRequest> = {}): GenerateRequest {
  return {
    description: 'Customers for a design tool',
    count: 10,
    fields: [validField],
    ...overrides,
  };
}

function getIssueFields(value: unknown) {
  const result = validateGenerateRequest(value);

  return result.valid ? [] : result.issues.map((issue) => issue.field);
}

describe('validateGenerateRequest', () => {
  it('accepts a valid request', () => {
    expect(validateGenerateRequest(buildRequest())).toEqual({ valid: true, data: buildRequest() });
  });

  it('rejects non-object requests', () => {
    expect(getIssueFields(null)).toContain('request');
    expect(getIssueFields([])).toContain('request');
  });

  describe('count', () => {
    it.each([REQUEST_LIMITS.recordsMinCount, REQUEST_LIMITS.recordsMaxCount])(
      'accepts %i',
      (count) => {
        expect(validateGenerateRequest(buildRequest({ count })).valid).toBe(true);
      },
    );

    it.each([0, REQUEST_LIMITS.recordsMaxCount + 1, 1.5, Number.NaN, -1])('rejects %s', (count) => {
      expect(getIssueFields(buildRequest({ count }))).toEqual(['count']);
    });

    it('rejects non-numeric counts', () => {
      expect(getIssueFields({ ...buildRequest(), count: '10' })).toEqual(['count']);
    });
  });

  describe('description', () => {
    it('accepts the maximum length', () => {
      const description = 'a'.repeat(REQUEST_LIMITS.descriptionMaxLength);

      expect(validateGenerateRequest(buildRequest({ description })).valid).toBe(true);
    });

    it('rejects empty and whitespace-only descriptions', () => {
      expect(getIssueFields(buildRequest({ description: '' }))).toEqual(['description']);
      expect(getIssueFields(buildRequest({ description: '   ' }))).toEqual(['description']);
    });

    it('rejects descriptions over the limit', () => {
      const description = 'a'.repeat(REQUEST_LIMITS.descriptionMaxLength + 1);

      expect(getIssueFields(buildRequest({ description }))).toContain('description');
    });
  });

  describe('fields', () => {
    it('rejects an empty field list', () => {
      expect(getIssueFields(buildRequest({ fields: [] }))).toEqual(['fields']);
    });

    it('accepts the maximum number of fields and rejects one more', () => {
      const fieldsAtLimit = Array.from({ length: REQUEST_LIMITS.fieldsMaxCount }, (_, index) => ({
        ...validField,
        name: `field${index}`,
      }));
      const fieldsOverLimit = [...fieldsAtLimit, { ...validField, name: 'extra' }];

      expect(validateGenerateRequest(buildRequest({ fields: fieldsAtLimit })).valid).toBe(true);
      expect(getIssueFields(buildRequest({ fields: fieldsOverLimit }))).toEqual(['fields']);
    });

    it('rejects non-array fields', () => {
      expect(getIssueFields({ ...buildRequest(), fields: 'name' })).toEqual(['fields']);
    });

    it('reports duplicate names on the later field', () => {
      const fields = [validField, { ...validField }];

      expect(getIssueFields(buildRequest({ fields }))).toEqual(['fields[1].name']);
    });

    it('rejects invalid names', () => {
      for (const name of ['', '1abc', 'has space', 'dash-name', 'émoji', 'a'.repeat(41)]) {
        expect(getIssueFields(buildRequest({ fields: [{ ...validField, name }] }))).toContain(
          'fields[0].name',
        );
      }
    });

    it('accepts camelCase, snake_case, and the maximum name length', () => {
      for (const name of ['customerName', 'invoice_total', 'a'.repeat(40)]) {
        expect(validateGenerateRequest(buildRequest({ fields: [{ ...validField, name }] })).valid).toBe(
          true,
        );
      }
    });

    it('rejects unknown types and non-boolean nullability', () => {
      const invalid = [{ name: 'a', type: 'date', nullable: false }, { name: 'b', type: 'string', nullable: 'yes' }];

      expect(getIssueFields(buildRequest({ fields: invalid as unknown as FieldDefinition[] }))).toEqual([
        'fields[0].type',
        'fields[1].nullable',
      ]);
    });

    it('limits guidance length', () => {
      const atLimit = 'a'.repeat(REQUEST_LIMITS.fieldGuidanceMaxLength);

      expect(
        validateGenerateRequest(buildRequest({ fields: [{ ...validField, guidance: atLimit }] })).valid,
      ).toBe(true);
      expect(
        getIssueFields(buildRequest({ fields: [{ ...validField, guidance: `${atLimit}a` }] })),
      ).toEqual(['fields[0].guidance']);
    });

    it('rejects non-object fields', () => {
      expect(getIssueFields(buildRequest({ fields: ['name'] as unknown as FieldDefinition[] }))).toEqual([
        'fields[0]',
      ]);
    });
  });

  it('rejects requests over the byte limit', () => {
    // Control characters expand to six bytes each once JSON-escaped.
    const fields = Array.from({ length: REQUEST_LIMITS.fieldsMaxCount }, (_, index) => ({
      ...validField,
      name: `field${index}`,
      guidance: '\u0001'.repeat(REQUEST_LIMITS.fieldGuidanceMaxLength),
    }));
    const request = buildRequest({
      description: '\u0001'.repeat(REQUEST_LIMITS.descriptionMaxLength),
      fields,
    });

    expect(getIssueFields(request)).toEqual(['request']);
  });
});
