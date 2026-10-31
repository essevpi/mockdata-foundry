import { describe, expect, it } from 'vitest';
import type { FieldDefinition } from '../lib/generation.js';
import { buildRecordSchema } from './record-schema.js';

const fields: FieldDefinition[] = [
  { name: 'fullName', type: 'string', nullable: false, guidance: 'First and last name' },
  { name: 'age', type: 'integer', nullable: true },
  { name: 'balance', type: 'number', nullable: false },
  { name: 'active', type: 'boolean', nullable: true },
];

describe('buildRecordSchema', () => {
  it('requires every field in declared order and closes the record', () => {
    expect(buildRecordSchema(fields)).toMatchObject({
      type: 'object',
      required: ['fullName', 'age', 'balance', 'active'],
      additionalProperties: false,
    });
  });

  it('uses a null union for nullable fields only', () => {
    expect(buildRecordSchema(fields)).toMatchObject({
      properties: {
        fullName: { type: 'string' },
        age: { type: ['integer', 'null'] },
        balance: { type: 'number' },
        active: { type: ['boolean', 'null'] },
      },
    });
  });

  it('leaves guidance out of the schema', () => {
    expect(JSON.stringify(buildRecordSchema(fields))).not.toContain('First and last name');
  });
});
