import { describe, expect, it, vi } from 'vitest';
import {
  REQUEST_LIMITS,
  type GenerateRequest,
  type GenerateSuccess,
  type GenerationError,
} from '../lib/generation.js';
import { handleGenerate, type GenerateLogEntry } from './handler.js';

const validRequest: GenerateRequest = {
  description: 'Customers for a design tool',
  count: 5,
  fields: [{ name: 'email', type: 'string', nullable: false }],
};

function buildRequest(body: string, init: RequestInit = {}): Request {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    ...init,
  });
}

function groqResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

const PLENTY_OF_BUDGET = {
  'x-ratelimit-limit-tokens': '8000',
  'x-ratelimit-remaining-tokens': '8000',
  'x-ratelimit-reset-tokens': '0s',
};

function groqCompletion(content: string, headers: Record<string, string> = PLENTY_OF_BUDGET) {
  return groqResponse(
    {
      choices: [{ message: { content }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 300, completion_tokens: 500 },
    },
    { headers: { 'Content-Type': 'application/json', ...headers } },
  );
}

// Provider output as JSON Lines, one record per line.
function lines(...records: unknown[]) {
  return records.map((record) => JSON.stringify(record)).join('\n');
}

async function run(
  request: Request,
  apiKey: string | undefined = 'test-key',
  providerResponse: (call: number) => Response | Promise<Response> = () =>
    groqResponse({}, { status: 500 }),
) {
  let calls = 0;
  const fetchSpy = vi.fn<typeof fetch>(async () => providerResponse((calls += 1)));
  const logSpy = vi.fn<(entry: GenerateLogEntry) => void>();
  const sleepSpy = vi.fn<(ms: number) => Promise<void>>(async () => {});
  const response = await handleGenerate(request, {
    apiKey,
    fetch: fetchSpy,
    log: logSpy,
    sleep: sleepSpy,
  });
  const text = await response.text();

  return {
    response,
    text,
    body: JSON.parse(text) as GenerationError & GenerateSuccess,
    fetchSpy,
    logSpy,
    sleepSpy,
  };
}

function sentBody(fetchSpy: ReturnType<typeof vi.fn<typeof fetch>>, call: number) {
  return JSON.parse(String(fetchSpy.mock.calls[call][1]?.body)) as {
    messages: Array<{ role: string; content: string }>;
  };
}

function validJsonRequest(overrides: Partial<GenerateRequest> = {}) {
  return buildRequest(JSON.stringify({ ...validRequest, ...overrides }));
}

describe('handleGenerate before the provider call', () => {
  it('rejects methods other than POST', async () => {
    const { response, body, fetchSpy } = await run(
      new Request('http://localhost/api/generate', { method: 'GET' }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
    expect(body.error.code).toBe('INVALID_REQUEST');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a declared content length over the limit', async () => {
    const { response, fetchSpy } = await run(
      buildRequest('{}', {
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(REQUEST_LIMITS.maxRequestBytes + 1),
        },
      }),
    );

    expect(response.status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a body over the limit', async () => {
    const oversized = JSON.stringify({
      ...validRequest,
      description: 'x'.repeat(REQUEST_LIMITS.maxRequestBytes),
    });
    const { response, body, fetchSpy } = await run(buildRequest(oversized));

    expect(response.status).toBe(413);
    expect(body.error.code).toBe('INVALID_REQUEST');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects a non-JSON content type', async () => {
    const { response, fetchSpy } = await run(
      buildRequest(JSON.stringify(validRequest), { headers: { 'Content-Type': 'text/plain' } }),
    );

    expect(response.status).toBe(415);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('accepts a JSON content type with a charset', async () => {
    const { response } = await run(
      buildRequest(JSON.stringify(validRequest), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }),
    );

    expect(response.status).not.toBe(415);
  });

  it('rejects malformed JSON', async () => {
    const { response, body, fetchSpy } = await run(buildRequest('{"description":'));

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('INVALID_REQUEST');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range request', async () => {
    const { response, fetchSpy } = await run(
      buildRequest(JSON.stringify({ ...validRequest, count: REQUEST_LIMITS.recordsMaxCount + 1 })),
    );

    expect(response.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports a configuration error when the API key is missing or empty', async () => {
    const { response, body, fetchSpy } = await run(
      buildRequest(JSON.stringify(validRequest)),
      '',
    );

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('CONFIGURATION_ERROR');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('marks responses as not cacheable', async () => {
    const { response } = await run(buildRequest('nope'));

    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Type')).toContain('application/json');
  });
});

describe('handleGenerate with the provider', () => {
  const a = { email: 'a@mail.test' };
  const b = { email: 'b@mail.test' };
  const c = { email: 'c@mail.test' };

  it('returns validated records from one call and logs usage without data', async () => {
    const { response, body, fetchSpy, logSpy } = await run(
      validJsonRequest({ count: 2 }),
      'test-key',
      () => groqCompletion(lines(a, b)),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({ records: [a, b] });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith({
      outcome: 'success',
      status: 200,
      attempt: 1,
      requestedRecords: 2,
      validRecords: 2,
      skippedLines: {},
      finishReason: 'stop',
      usage: { promptTokens: 300, completionTokens: 500, reasoningTokens: undefined },
      records: 2,
      fields: 1,
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('mail.test');
  });

  it('keeps the first records when the model writes more', async () => {
    const { body, logSpy } = await run(validJsonRequest({ count: 2 }), 'test-key', () =>
      groqCompletion(lines(a, b, c)),
    );

    expect(body).toEqual({ records: [a, b] });
    expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success', validRecords: 3 }));
  });

  it('skips invalid lines and still succeeds when enough remain', async () => {
    const content = ['```json', JSON.stringify(a), '{"email": 1}', JSON.stringify(b), '{"email": "c@'].join('\n');
    const { body, logSpy } = await run(validJsonRequest({ count: 2 }), 'test-key', () =>
      groqCompletion(content),
    );

    expect(body).toEqual({ records: [a, b] });
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ skippedLines: { not_json: 2, type: 1 } }),
    );
  });

  it('tops up the missing records with one more call that avoids existing values', async () => {
    const { body, fetchSpy, logSpy, sleepSpy } = await run(
      validJsonRequest({ count: 3 }),
      'test-key',
      (call) => groqCompletion(call === 1 ? lines(a, { email: 1 }) : lines(b, c)),
    );

    expect(body).toEqual({ records: [a, b, c] });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(sleepSpy).not.toHaveBeenCalled();

    const topUp = sentBody(fetchSpy, 1).messages[1].content;
    expect(topUp).toContain('Generate 2 records.');
    expect(topUp).toContain('["a@mail.test"]');
    expect(logSpy.mock.calls.map(([entry]) => entry.outcome)).toEqual(['partial', 'success']);
  });

  it('waits for the per-minute token budget before a top-up', async () => {
    const lowBudget = {
      'x-ratelimit-limit-tokens': '8000',
      'x-ratelimit-remaining-tokens': '0',
      'x-ratelimit-reset-tokens': '10s',
    };
    const { body, sleepSpy } = await run(validJsonRequest({ count: 2 }), 'test-key', (call) =>
      groqCompletion(call === 1 ? lines(a) : lines(b), lowBudget),
    );

    expect(body).toEqual({ records: [a, b] });
    expect(sleepSpy).toHaveBeenCalledTimes(1);
    expect(sleepSpy.mock.calls[0][0]).toBeGreaterThan(0);
    expect(sleepSpy.mock.calls[0][0]).toBeLessThanOrEqual(10_000);
  });

  it('fails without a top-up when the budget would take too long to refill', async () => {
    const exhausted = {
      'x-ratelimit-limit-tokens': '1000',
      'x-ratelimit-remaining-tokens': '0',
      'x-ratelimit-reset-tokens': '59s',
    };
    const { response, body, fetchSpy, logSpy } = await run(
      validJsonRequest({ count: 2 }),
      'test-key',
      () => groqCompletion(lines(a), exhausted),
    );

    expect(response.status).toBe(502);
    expect(body.error.code).toBe('INVALID_GENERATION');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'INVALID_GENERATION', reason: 'too_few_records', validRecords: 1 }),
    );
  });

  it('fails after one top-up that still leaves records missing', async () => {
    const { response, fetchSpy, logSpy } = await run(validJsonRequest({ count: 3 }), 'test-key', () =>
      groqCompletion(lines(a)),
    );

    expect(response.status).toBe(502);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(logSpy.mock.calls.map(([entry]) => entry.outcome)).toEqual(['partial', 'INVALID_GENERATION']);
  });

  it('passes a provider rate limit on with its retry delay', async () => {
    const { response, body } = await run(validJsonRequest(), 'test-key', () =>
      groqResponse({ error: { message: 'Limit 8000, Used 7999' } }, {
        status: 429,
        headers: { 'retry-after': '30' },
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(body.error).toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 30 });
  });

  it.each([
    [401, 500, 'CONFIGURATION_ERROR'],
    [400, 502, 'UPSTREAM_ERROR'],
    [503, 502, 'UPSTREAM_ERROR'],
  ])('maps provider status %i to %i %s', async (providerStatus, status, code) => {
    const { response, body, logSpy } = await run(validJsonRequest(), 'test-key', () =>
      groqResponse({ error: { message: 'provider detail' } }, { status: providerStatus }),
    );

    expect(response.status).toBe(status);
    expect(body.error.code).toBe(code);
    expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({ outcome: code, providerStatus }));
  });

  it('never exposes the API key or provider messages', async () => {
    const results = await Promise.all([
      run(validJsonRequest(), 'secret-key', () =>
        groqResponse({ error: { message: 'provider detail' } }, { status: 401 }),
      ),
      run(validJsonRequest(), 'secret-key', () =>
        groqResponse({ error: { message: 'provider detail' } }, { status: 400 }),
      ),
    ]);

    for (const { text, logSpy } of results) {
      const logged = JSON.stringify(logSpy.mock.calls);

      expect(text).not.toMatch(/secret-key|provider detail/);
      expect(logged).not.toMatch(/secret-key|provider detail|Customers for a design tool/);
    }
  });
});
