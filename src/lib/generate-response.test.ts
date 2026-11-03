import { describe, expect, it } from 'vitest';
import { GENERATION_ERROR_MESSAGES, type GenerateRequest } from './generation';
import { readGenerateResponse } from './generate-response';

const request: GenerateRequest = {
  description: 'Customers',
  count: 2,
  fields: [
    { name: 'name', type: 'string', nullable: false },
    { name: 'age', type: 'integer', nullable: true },
  ],
};

const ada = { name: 'Ada', age: 36 };
const grace = { name: 'Grace', age: null };

function read(status: number, body: unknown, headers: Record<string, string> = {}) {
  return readGenerateResponse(
    {
      status,
      headers: new Headers(headers),
      bodyText: typeof body === 'string' ? body : JSON.stringify(body),
    },
    request,
  );
}

function error(code: keyof typeof GENERATION_ERROR_MESSAGES, retryAfterSeconds?: number) {
  return {
    error: {
      code,
      message: GENERATION_ERROR_MESSAGES[code],
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    },
  };
}

describe('readGenerateResponse', () => {
  it('returns the records of a valid success in field order', () => {
    const result = read(200, { records: [{ age: 36, name: 'Ada' }, grace] });

    expect(result).toEqual({ records: [ada, grace] });
    expect('records' in result && Object.keys(result.records[0])).toEqual(['name', 'age']);
  });

  it.each([
    ['too few records', { records: [ada] }],
    ['too many records', { records: [ada, grace, ada] }],
    ['a missing field', { records: [ada, { name: 'Grace' }] }],
    ['an extra field', { records: [ada, { ...grace, extra: 1 }] }],
    ['a wrong type', { records: [ada, { name: 'Grace', age: '36' }] }],
    ['no records array', { data: [ada, grace] }],
    ['a non-JSON body', '<html>OK</html>'],
  ])('treats a 200 with %s as UPSTREAM_ERROR', (_, body) => {
    expect(read(200, body)).toEqual(error('UPSTREAM_ERROR'));
  });

  it('uses the client message for a known error code, ignoring the body text', () => {
    const body = { error: { code: 'INVALID_GENERATION', message: '<b>injected</b>' } };

    expect(read(502, body)).toEqual(error('INVALID_GENERATION'));
  });

  it('keeps a valid retryAfterSeconds from the envelope', () => {
    const body = { error: { code: 'RATE_LIMITED', message: 'x', retryAfterSeconds: 7 } };

    expect(read(429, body)).toEqual(error('RATE_LIMITED', 7));
  });

  it.each(['-1', '0', '"soon"', 'null', '1e999'])('drops retryAfterSeconds %s', (retryAfterSeconds) => {
    const body = `{"error":{"code":"RATE_LIMITED","message":"x","retryAfterSeconds":${retryAfterSeconds}}}`;

    expect(read(429, body)).toEqual(error('RATE_LIMITED'));
  });

  it('reads Retry-After from a 429 that is not our envelope, such as the firewall reply', () => {
    expect(read(429, '<html>Too Many Requests</html>', { 'Retry-After': '600' })).toEqual(
      error('RATE_LIMITED', 600),
    );
    expect(read(429, '')).toEqual(error('RATE_LIMITED'));
  });

  it("maps the Vercel Firewall's rate-limit reply (measured November 2026) to RATE_LIMITED", () => {
    const body = { error: { code: '429', message: 'Too Many Requests', id: 'fra1::abc' } };

    expect(read(429, body)).toEqual(error('RATE_LIMITED'));
  });

  it('maps an unknown error code by status', () => {
    expect(read(400, { error: { code: 'TEAPOT', message: 'x' } })).toEqual(error('INVALID_REQUEST'));
  });

  it.each([
    [404, 'CONFIGURATION_ERROR'],
    [405, 'INVALID_REQUEST'],
    [413, 'INVALID_REQUEST'],
    [500, 'UPSTREAM_ERROR'],
    [504, 'UPSTREAM_ERROR'],
  ] as const)('maps a non-envelope %i to %s', (status, code) => {
    expect(read(status, 'An error occurred')).toEqual(error(code));
  });
});
