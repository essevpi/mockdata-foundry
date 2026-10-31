import { describe, expect, it } from 'vitest';
import { REQUEST_LIMITS, type GenerateRequest } from '../lib/generation.js';
import { validateGeneratedOutput } from './output-validation.js';

const request: GenerateRequest = {
  description: 'Customers',
  count: 2,
  fields: [
    { name: 'name', type: 'string', nullable: false },
    { name: 'age', type: 'integer', nullable: true },
    { name: 'balance', type: 'number', nullable: false },
    { name: 'active', type: 'boolean', nullable: false },
  ],
};

function validRecords() {
  return [
    { name: 'Ada Lovelace', age: 36, balance: 120.5, active: true },
    { name: '', age: null, balance: -3, active: false },
  ];
}

function validate(records: unknown[], override: Partial<GenerateRequest> = {}) {
  return validateGeneratedOutput(JSON.stringify({ records }), { ...request, ...override });
}

function withFirstRecord(changes: Record<string, unknown>) {
  const [first, second] = validRecords();

  return [{ ...first, ...changes }, second];
}

describe('validateGeneratedOutput', () => {
  it('accepts valid output', () => {
    expect(validate(validRecords())).toEqual({ ok: true, records: validRecords(), droppedRecords: 0 });
  });

  it('returns records in the declared field order', () => {
    const shuffled = validRecords().map(({ active, age, balance, name }) => ({
      active,
      balance,
      age,
      name,
    }));
    const result = validate(shuffled);

    expect(result.ok && Object.keys(result.records[0])).toEqual(['name', 'age', 'balance', 'active']);
  });

  it('accepts a field named like an Object.prototype member', () => {
    const result = validate([{ constructor: 'x' }], {
      count: 1,
      fields: [{ name: 'constructor', type: 'string', nullable: false }],
    });

    expect(result).toEqual({ ok: true, records: [{ constructor: 'x' }], droppedRecords: 0 });
  });

  it('rejects content that is not JSON', () => {
    expect(validateGeneratedOutput('{"records": [', request)).toEqual({
      ok: false,
      reason: 'invalid_json',
    });
  });

  it.each([
    ['a top-level array', JSON.stringify(validRecords())],
    ['records that is not an array', JSON.stringify({ records: {} })],
    ['an extra top-level key', JSON.stringify({ records: validRecords(), note: 'hi' })],
  ])('rejects %s', (_, content) => {
    expect(validateGeneratedOutput(content, request)).toEqual({ ok: false, reason: 'wrong_shape' });
  });

  it('rejects a record that is not an object', () => {
    expect(validate([validRecords()[0], 'nope'])).toEqual({ ok: false, reason: 'wrong_shape' });
  });

  it('rejects too few records', () => {
    expect(validate(validRecords().slice(0, 1))).toEqual({
      ok: false,
      reason: 'record_count',
      receivedRecords: 1,
    });
  });

  it('keeps the first records unchanged when there are too many', () => {
    const surplus = { name: 'Extra', age: 1, balance: 1, active: true };

    expect(validate([...validRecords(), surplus, surplus])).toEqual({
      ok: true,
      records: validRecords(),
      droppedRecords: 2,
    });
  });

  it('ignores invalid surplus records', () => {
    expect(validate([...validRecords(), { bogus: true }])).toMatchObject({
      ok: true,
      droppedRecords: 1,
    });
  });

  it('still validates the records it keeps', () => {
    expect(validate([...withFirstRecord({ age: 'old' }), validRecords()[0]])).toEqual({
      ok: false,
      reason: 'type',
    });
  });

  it('rejects a missing field', () => {
    const [first, second] = validRecords();
    const withoutActive: Record<string, unknown> = { ...first };
    delete withoutActive.active;

    expect(validate([withoutActive, second])).toEqual({ ok: false, reason: 'field_set' });
  });

  it('rejects an undeclared field', () => {
    expect(validate(withFirstRecord({ extra: 1 }))).toEqual({ ok: false, reason: 'field_set' });
  });

  it.each([
    ['a number for a string', { name: 42 }],
    ['a decimal for an integer', { age: 1.5 }],
    ['an unsafe integer', { age: 2 ** 53 }],
    ['a string for a number', { balance: '12' }],
    ['a string for a boolean', { active: 'true' }],
  ])('rejects %s', (_, changes) => {
    expect(validate(withFirstRecord(changes))).toEqual({ ok: false, reason: 'type' });
  });

  it('rejects an out-of-range number literal', () => {
    const content = '{"records":[{"name":"a","age":1,"balance":1e999,"active":true}]}';

    expect(validateGeneratedOutput(content, { ...request, count: 1 })).toEqual({
      ok: false,
      reason: 'type',
    });
  });

  it('rejects null on a non-nullable field', () => {
    expect(validate(withFirstRecord({ name: null }))).toEqual({
      ok: false,
      reason: 'null_not_allowed',
    });
  });

  it('caps strings by code points', () => {
    const max = REQUEST_LIMITS.returnedStringMaxLength;

    expect(validate(withFirstRecord({ name: '😀'.repeat(max) })).ok).toBe(true);
    expect(validate(withFirstRecord({ name: 'a'.repeat(max + 1) }))).toEqual({
      ok: false,
      reason: 'string_length',
    });
  });
});
