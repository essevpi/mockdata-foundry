import { describe, expect, it } from 'vitest';
import { REQUEST_LIMITS, type FieldDefinition } from '../lib/generation.js';
import { parseRecordLines } from './record-lines.js';

const fields: FieldDefinition[] = [
  { name: 'name', type: 'string', nullable: false },
  { name: 'age', type: 'integer', nullable: true },
  { name: 'balance', type: 'number', nullable: false },
  { name: 'active', type: 'boolean', nullable: false },
];

const ada = { name: 'Ada Lovelace', age: 36, balance: 120.5, active: true };
const empty = { name: '', age: null, balance: -3, active: false };

function lines(...values: unknown[]) {
  return values.map((value) => (typeof value === 'string' ? value : JSON.stringify(value))).join('\n');
}

function withAda(changes: Record<string, unknown>) {
  return lines({ ...ada, ...changes });
}

describe('parseRecordLines', () => {
  it('parses one record per line', () => {
    expect(parseRecordLines(lines(ada, empty), fields)).toEqual({ records: [ada, empty], skipped: {} });
  });

  it('ignores blank lines and surrounding whitespace', () => {
    expect(parseRecordLines(`\n  ${JSON.stringify(ada)}  \r\n\n`, fields)).toEqual({
      records: [ada],
      skipped: {},
    });
  });

  it('returns records in the declared field order', () => {
    const { records } = parseRecordLines(lines({ active: true, balance: 1, age: 2, name: 'x' }), fields);

    expect(Object.keys(records[0])).toEqual(['name', 'age', 'balance', 'active']);
  });

  it('accepts a field named like an Object.prototype member', () => {
    const result = parseRecordLines(lines({ constructor: 'x' }), [
      { name: 'constructor', type: 'string', nullable: false },
    ]);

    expect(result).toEqual({ records: [{ constructor: 'x' }], skipped: {} });
  });

  it('skips lines that are not JSON, such as code fences or a truncated last record', () => {
    const result = parseRecordLines(lines('```json', ada, '```', '{"name":"Grace'), fields);

    expect(result).toEqual({ records: [ada], skipped: { not_json: 3 } });
  });

  it.each([
    ['an array', [ada]],
    ['a string', '"Ada"'],
    ['null', 'null'],
  ])('skips a line holding %s as wrong_shape', (_, value) => {
    expect(parseRecordLines(lines(value), fields).skipped).toEqual({ wrong_shape: 1 });
  });

  it('skips a record with a missing or undeclared field', () => {
    const { active: _active, ...withoutActive } = ada;

    expect(parseRecordLines(lines(withoutActive, { ...ada, extra: 1 }), fields)).toEqual({
      records: [],
      skipped: { field_set: 2 },
    });
    expect(_active).toBe(true);
  });

  it.each([
    ['a number for a string', { name: 42 }],
    ['a decimal for an integer', { age: 1.5 }],
    ['an unsafe integer', { age: 2 ** 53 }],
    ['a string for a number', { balance: '12' }],
    ['a string for a boolean', { active: 'true' }],
  ])('skips %s as type', (_, changes) => {
    expect(parseRecordLines(withAda(changes), fields).skipped).toEqual({ type: 1 });
  });

  it('skips an out-of-range number literal as type', () => {
    const line = '{"name":"a","age":1,"balance":1e999,"active":true}';

    expect(parseRecordLines(line, fields).skipped).toEqual({ type: 1 });
  });

  it('skips null on a non-nullable field', () => {
    expect(parseRecordLines(withAda({ name: null }), fields).skipped).toEqual({ null_not_allowed: 1 });
  });

  it('caps strings by code points', () => {
    const max = REQUEST_LIMITS.returnedStringMaxLength;

    expect(parseRecordLines(withAda({ name: '😀'.repeat(max) }), fields).records).toHaveLength(1);
    expect(parseRecordLines(withAda({ name: 'a'.repeat(max + 1) }), fields).skipped).toEqual({
      string_length: 1,
    });
  });

  it('keeps the valid records around a bad one', () => {
    expect(parseRecordLines(lines(ada, { ...ada, age: 'old' }, empty), fields)).toEqual({
      records: [ada, empty],
      skipped: { type: 1 },
    });
  });
});
