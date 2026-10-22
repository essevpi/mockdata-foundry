import { afterEach, describe, expect, it, vi } from 'vitest';
import { generate } from './generate';
import { validateGenerateRequest, type GenerateRequest } from './generation';
import { MOCK_OUTCOMES, createMockSuccess, getMockResponse } from './mock-generator';

const request: GenerateRequest = {
  description: 'Customers',
  count: 12,
  fields: [
    { name: 'name', type: 'string', nullable: false },
    { name: 'nickname', type: 'string', nullable: true },
    { name: 'balance', type: 'number', nullable: true },
    { name: 'age', type: 'integer', nullable: false },
    { name: 'active', type: 'boolean', nullable: true },
  ],
};

describe('createMockSuccess', () => {
  const { records } = createMockSuccess(request);

  it('returns the requested number of records with exactly the declared fields', () => {
    expect(records).toHaveLength(request.count);

    for (const record of records) {
      expect(Object.keys(record)).toEqual(request.fields.map((field) => field.name));
    }
  });

  it('respects declared types and nullability', () => {
    for (const record of records) {
      expect(record.name).not.toBeNull();
      expect(Number.isInteger(record.age)).toBe(true);
      expect([null, 'string']).toContain(record.nickname === null ? null : typeof record.nickname);
      expect([null, 'number']).toContain(record.balance === null ? null : typeof record.balance);
      expect([null, 'boolean']).toContain(record.active === null ? null : typeof record.active);
    }
  });

  it('shows both null and empty-string values', () => {
    expect(records.some((record) => record.nickname === null)).toBe(true);
    expect(records.some((record) => record.name === '')).toBe(true);
  });

  it('keeps strings within the returned-string limit', () => {
    const longName = { name: 'a'.repeat(40), type: 'string' as const, nullable: false };
    const [first] = createMockSuccess({ ...request, count: 1, fields: [longName] }).records;

    expect((first[longName.name] as string).length).toBeLessThanOrEqual(64);
  });

  it('is deterministic and passes request validation for its own input', () => {
    expect(createMockSuccess(request)).toEqual({ records });
    expect(validateGenerateRequest(request).valid).toBe(true);
  });
});

describe('getMockResponse', () => {
  it.each(MOCK_OUTCOMES.filter((outcome) => outcome !== 'success'))(
    'returns the %s error envelope',
    (outcome) => {
      expect(getMockResponse(request, outcome)).toMatchObject({ error: { code: outcome } });
    },
  );

  it('includes a retry delay for rate limiting only', () => {
    expect(getMockResponse(request, 'RATE_LIMITED')).toMatchObject({
      error: { retryAfterSeconds: 600 },
    });
    expect(getMockResponse(request, 'UPSTREAM_ERROR')).not.toHaveProperty('error.retryAfterSeconds');
  });
});

describe('generate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after a delay with the chosen outcome', async () => {
    vi.useFakeTimers();

    const pending = generate(request, { mockOutcome: 'RATE_LIMITED' });
    let settled = false;
    void pending.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(100);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);
    expect(await pending).toMatchObject({ error: { code: 'RATE_LIMITED' } });
  });

  it('defaults to success', async () => {
    vi.useFakeTimers();

    const pending = generate(request);
    await vi.advanceTimersByTimeAsync(2_000);

    expect(await pending).toEqual(createMockSuccess(request));
  });
});
