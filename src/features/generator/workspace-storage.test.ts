import { describe, expect, it } from 'vitest';
import { REQUEST_LIMITS, type GenerateRequest } from '../../lib/generation';
import {
  FORM_DRAFT_STORAGE_KEY,
  createFormDraft,
  LAST_RESULT_STORAGE_KEY,
  parseFormDraft,
  parseLastResult,
  readFormDraft,
  readLastResult,
  removeLastResult,
  storeFormDraft,
  storeLastResult,
  type FormDraft,
} from './workspace-storage';

function createStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));

  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

const draft: FormDraft = {
  description: 'Customers',
  recordCount: '12',
  fields: [
    { name: 'name', type: 'string', nullable: false, guidance: 'Full name' },
    { name: 'age', type: 'integer', nullable: true },
  ],
};

const request: GenerateRequest = {
  description: 'Customers',
  count: 2,
  fields: [
    { name: 'name', type: 'string', nullable: false },
    { name: 'age', type: 'integer', nullable: true },
  ],
};

const records = [
  { name: 'Ada', age: 36 },
  { name: 'Grace', age: null },
];

describe('form draft', () => {
  it('stores fields as typed, without the row ids', () => {
    expect(
      createFormDraft('Customers', '12', [
        { id: 'field-1', name: 'name', type: 'string', nullable: false, guidance: 'Full name' },
        { id: 'field-2', name: 'age', type: 'integer', nullable: true },
      ]),
    ).toEqual(draft);
  });

  it('round-trips through storage', () => {
    const storage = createStorage();

    storeFormDraft(storage, draft);

    expect(readFormDraft(storage)).toEqual(draft);
  });

  it('keeps an incomplete draft as typed', () => {
    const incomplete = { v: 1, description: '', recordCount: '', fields: [{ name: '', type: 'string', nullable: false }] };

    expect(parseFormDraft(incomplete)).toEqual({
      description: '',
      recordCount: '',
      fields: [{ name: '', type: 'string', nullable: false }],
    });
  });

  it.each([
    ['nothing stored', undefined],
    ['another version', { ...draft, v: 2 }],
    ['a non-string description', { ...draft, v: 1, description: 42 }],
    ['fields that are not a list', { ...draft, v: 1, fields: {} }],
    ['an array', [draft]],
  ])('gives no draft for %s', (_, value) => {
    expect(parseFormDraft(value)).toBeUndefined();
  });

  it('cuts strings to the input limits and keeps at most the field limit', () => {
    const long = 'x'.repeat(2_000);
    const parsed = parseFormDraft({
      v: 1,
      description: long,
      recordCount: '5',
      fields: Array.from({ length: 9 }, (_, index) => ({
        name: `${long}${index}`,
        type: 'string',
        nullable: false,
        guidance: long,
      })),
    });

    expect(parsed?.description).toHaveLength(REQUEST_LIMITS.descriptionMaxLength);
    expect(parsed?.fields).toHaveLength(REQUEST_LIMITS.fieldsMaxCount);
    expect(parsed?.fields[0].name).toHaveLength(REQUEST_LIMITS.fieldNameMaxLength);
    expect(parsed?.fields[0].guidance).toHaveLength(REQUEST_LIMITS.fieldGuidanceMaxLength);
  });

  it('drops malformed field rows and falls back to the default record count', () => {
    const parsed = parseFormDraft({
      v: 1,
      description: 'x',
      recordCount: 'lots',
      fields: [
        { name: 'ok', type: 'boolean', nullable: true },
        { name: 'badType', type: 'date', nullable: false },
        { name: 'badNullable', type: 'string', nullable: 'yes' },
        null,
      ],
    });

    expect(parsed).toEqual({
      description: 'x',
      recordCount: '10',
      fields: [{ name: 'ok', type: 'boolean', nullable: true }],
    });
  });

  it('survives storage that throws', () => {
    expect(readFormDraft(throwingStorage)).toBeUndefined();
    expect(() => storeFormDraft(throwingStorage, draft)).not.toThrow();
  });

  it('gives no draft for text that is not JSON', () => {
    expect(readFormDraft(createStorage({ [FORM_DRAFT_STORAGE_KEY]: '{oops' }))).toBeUndefined();
  });
});

describe('last result', () => {
  it('round-trips through storage', () => {
    const storage = createStorage();

    storeLastResult(storage, { request, result: { records } });

    expect(readLastResult(storage)).toEqual({ request, result: { records } });
  });

  it('is removed', () => {
    const storage = createStorage({ [LAST_RESULT_STORAGE_KEY]: '{}' });

    removeLastResult(storage);

    expect(storage.data.has(LAST_RESULT_STORAGE_KEY)).toBe(false);
    expect(() => removeLastResult(throwingStorage)).not.toThrow();
  });

  it.each([
    ['another version', { v: 2, request, records }],
    ['an invalid request', { v: 1, request: { ...request, count: 0 }, records }],
    ['a different record count', { v: 1, request, records: records.slice(1) }],
    ['a record that fails the check', { v: 1, request, records: [records[0], { name: 'Grace', age: '36' }] }],
    ['a record with an extra field', { v: 1, request, records: [records[0], { ...records[1], extra: 1 }] }],
  ])('is rejected with %s', (_, value) => {
    expect(parseLastResult(value)).toBeUndefined();
  });

  it('survives storage that throws', () => {
    expect(readLastResult(throwingStorage)).toBeUndefined();
    expect(() => storeLastResult(throwingStorage, { request, result: { records } })).not.toThrow();
  });
});
