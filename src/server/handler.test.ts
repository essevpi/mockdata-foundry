import { describe, expect, it, vi } from 'vitest';
import { REQUEST_LIMITS, type GenerateRequest, type GenerationError } from '../lib/generation.js';
import { handleGenerate } from './handler.js';

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

async function run(request: Request, apiKey: string | undefined = 'test-key') {
  const fetchSpy = vi.fn<typeof fetch>();
  const response = await handleGenerate(request, { apiKey, fetch: fetchSpy });

  return { response, body: (await response.json()) as GenerationError, fetchSpy };
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

  it('reports a configuration error when the API key is missing', async () => {
    const { response, body, fetchSpy } = await run(
      buildRequest(JSON.stringify(validRequest)),
      undefined,
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
