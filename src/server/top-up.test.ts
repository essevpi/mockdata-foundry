import { describe, expect, it } from 'vitest';
import type { GenerateRequest } from '../lib/generation.js';
import { GROQ_TIMEOUT_MS } from './groq.js';
import { MAX_TOP_UP_WAIT_MS, TIME_BUDGET_MS, getAvoidValues, getTopUpDelayMs } from './top-up.js';

describe('getTopUpDelayMs', () => {
  const budget = { limitTokens: 8_000, resetTokensMs: 30_000 };

  it('goes straight away when enough tokens remain', () => {
    expect(getTopUpDelayMs({ ...budget, remainingTokens: 5_000 }, 4_000, 5_000)).toBe(0);
  });

  it('goes straight away without rate-limit headers', () => {
    expect(getTopUpDelayMs({}, 4_000, 5_000)).toBe(0);
  });

  it('waits for the share of the budget that is missing', () => {
    // 2,000 of the 6,000 tokens still to refill are needed: a third of the 30 s reset.
    expect(getTopUpDelayMs({ ...budget, remainingTokens: 2_000 }, 4_000, 5_000)).toBe(10_000);
  });

  it('gives up when the wait would be too long', () => {
    expect(getTopUpDelayMs({ ...budget, remainingTokens: 0 }, 8_000, 0)).toBeUndefined();
    expect(MAX_TOP_UP_WAIT_MS).toBeLessThan(30_000);
  });

  it('gives up when a full request no longer fits in the time budget', () => {
    const elapsed = TIME_BUDGET_MS - GROQ_TIMEOUT_MS + 1;

    expect(getTopUpDelayMs({ ...budget, remainingTokens: 8_000 }, 1_000, elapsed)).toBeUndefined();
  });

  it('gives up when the request needs more than the whole budget or refill data is missing', () => {
    expect(getTopUpDelayMs({ ...budget, remainingTokens: 100 }, 9_000, 0)).toBeUndefined();
    expect(getTopUpDelayMs({ remainingTokens: 100 }, 1_000, 0)).toBeUndefined();
  });
});

describe('getAvoidValues', () => {
  const request: GenerateRequest = {
    description: 'Customers',
    count: 3,
    fields: [
      { name: 'age', type: 'integer', nullable: false },
      { name: 'customerId', type: 'string', nullable: false },
    ],
  };

  it('lists the first string field of the accepted records', () => {
    const records = [
      { age: 30, customerId: 'CUS-1' },
      { age: 31, customerId: 'CUS-2' },
    ];

    expect(getAvoidValues(request, records)).toEqual({ field: 'customerId', values: ['CUS-1', 'CUS-2'] });
  });

  it('skips null and empty values, and returns nothing without values', () => {
    expect(getAvoidValues(request, [{ age: 1, customerId: '' }])).toBeUndefined();
    expect(
      getAvoidValues({ ...request, fields: [{ name: 'note', type: 'string', nullable: true }] }, [
        { note: null },
      ]),
    ).toBeUndefined();
  });

  it('returns nothing when no field is a string', () => {
    expect(
      getAvoidValues({ ...request, fields: [{ name: 'age', type: 'integer', nullable: false }] }, [{ age: 1 }]),
    ).toBeUndefined();
  });
});
