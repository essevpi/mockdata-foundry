import { describe, expect, it } from 'vitest';
import type { FieldDefinition } from './generation';
import { checkRecord } from './record-check';

const fields: FieldDefinition[] = [
  { name: 'name', type: 'string', nullable: false },
  { name: 'age', type: 'integer', nullable: true },
  { name: 'active', type: 'boolean', nullable: false },
];

describe('checkRecord', () => {
  it('returns a valid record in the declared field order', () => {
    const check = checkRecord({ active: true, age: null, name: '' }, fields);

    expect(check).toEqual({ ok: true, record: { name: '', age: null, active: true } });
    expect(check.ok && Object.keys(check.record)).toEqual(['name', 'age', 'active']);
  });

  it.each([
    ['an array', [], 'wrong_shape'],
    ['null', null, 'wrong_shape'],
    ['a missing field', { name: 'a', age: 1 }, 'field_set'],
    ['an undeclared field', { name: 'a', age: 1, active: true, extra: 1 }, 'field_set'],
    ['a decimal integer', { name: 'a', age: 1.5, active: true }, 'type'],
    ['a string boolean', { name: 'a', age: 1, active: 'true' }, 'type'],
    ['null on a non-nullable field', { name: null, age: 1, active: true }, 'null_not_allowed'],
    ['an over-long string', { name: 'a'.repeat(101), age: 1, active: true }, 'string_length'],
  ])('rejects %s', (_, value, problem) => {
    expect(checkRecord(value, fields)).toEqual({ ok: false, problem });
  });
});
