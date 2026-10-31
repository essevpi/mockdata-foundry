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

function groqCompletion(content: string, finishReason = 'stop') {
  return groqResponse({
    choices: [{ message: { content }, finish_reason: finishReason }],
    usage: { prompt_tokens: 300, completion_tokens: 500 },
  });
}

async function run(
  request: Request,
  apiKey: string | undefined = 'test-key',
  providerResponse: () => Response | Promise<Response> = () => groqResponse({}, { status: 500 }),
) {
  const fetchSpy = vi.fn<typeof fetch>(async () => providerResponse());
  const logSpy = vi.fn<(entry: GenerateLogEntry) => void>();
  const response = await handleGenerate(request, { apiKey, fetch: fetchSpy, log: logSpy });
  const text = await response.text();

  return {
    response,
    text,
    body: JSON.parse(text) as GenerationError & GenerateSuccess,
    fetchSpy,
    logSpy,
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
  const twoRecords = { records: [{ email: 'a@example.com' }, { email: 'b@example.com' }] };
  const providerTwoRecords = JSON.stringify(twoRecords);

  it('returns validated records on success and logs usage without data', async () => {
    const { response, body, logSpy } = await run(validJsonRequest({ count: 2 }), 'test-key', () =>
      groqCompletion(providerTwoRecords),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual(twoRecords);
    expect(logSpy).toHaveBeenCalledWith({
      outcome: 'success',
      status: 200,
      droppedRecords: 0,
      finishReason: 'stop',
      usage: { promptTokens: 300, completionTokens: 500, reasoningTokens: undefined },
      records: 2,
      fields: 1,
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('example.com');
  });

  it('returns the requested number of records when the model overshoots', async () => {
    const { response, body, logSpy } = await run(validJsonRequest({ count: 1 }), 'test-key', () =>
      groqCompletion(providerTwoRecords),
    );

    expect(response.status).toBe(200);
    expect(body).toEqual({ records: [twoRecords.records[0]] });
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'success', droppedRecords: 1 }),
    );
  });

  it('discards output that fails validation', async () => {
    const { response, body, logSpy } = await run(validJsonRequest({ count: 3 }), 'test-key', () =>
      groqCompletion(providerTwoRecords),
    );

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error: { code: 'INVALID_GENERATION', message: expect.any(String) },
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'INVALID_GENERATION',
        reason: 'record_count',
        receivedRecords: 2,
      }),
    );
  });

  it('discards a truncated completion even if it parses', async () => {
    const { response, logSpy } = await run(validJsonRequest({ count: 2 }), 'test-key', () =>
      groqCompletion(providerTwoRecords, 'length'),
    );

    expect(response.status).toBe(502);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'finish_reason_length', finishReason: 'length' }),
    );
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
