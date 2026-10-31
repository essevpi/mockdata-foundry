import { describe, expect, it } from 'vitest';
import type { FieldDefinition } from '../lib/generation.js';
import { buildResponseSchema } from './response-schema.js';

const fields: FieldDefinition[] = [
  { name: 'fullName', type: 'string', nullable: false, guidance: 'First and last name' },
  { name: 'age', type: 'integer', nullable: true },
  { name: 'balance', type: 'number', nullable: false },
  { name: 'active', type: 'boolean', nullable: true },
];

describe('buildResponseSchema', () => {
  it('wraps a closed records array in a closed object', () => {
    expect(buildResponseSchema(fields)).toMatchObject({
      type: 'object',
      required: ['records'],
      additionalProperties: false,
      properties: { records: { type: 'array' } },
    });
  });

  it('requires every field in declared order and closes each record', () => {
    expect(buildResponseSchema(fields)).toMatchObject({
      properties: {
        records: {
          items: {
            type: 'object',
            required: ['fullName', 'age', 'balance', 'active'],
            additionalProperties: false,
          },
        },
      },
    });
  });

  it('uses a null union for nullable fields only', () => {
    expect(buildResponseSchema(fields)).toMatchObject({
      properties: {
        records: {
          items: {
            properties: {
              fullName: { type: 'string' },
              age: { type: ['integer', 'null'] },
              balance: { type: 'number' },
              active: { type: ['boolean', 'null'] },
            },
          },
        },
      },
    });
  });

  it('leaves guidance, array bounds and string constraints out of the schema', () => {
    const text = JSON.stringify(buildResponseSchema(fields));

    expect(text).not.toContain('First and last name');
    expect(text).not.toMatch(/minItems|maxItems|maxLength|format/);
  });
});
