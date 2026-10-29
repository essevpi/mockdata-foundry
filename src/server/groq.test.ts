import { describe, expect, it, vi } from 'vitest';
import type { GenerateRequest } from '../lib/generation.js';
import {
  GROQ_CHAT_COMPLETIONS_URL,
  GROQ_MODEL,
  MAX_COMPLETION_TOKENS,
  buildGroqBody,
  callGroq,
  parseRetryAfter,
} from './groq.js';
import { buildResponseSchema } from './response-schema.js';

const request: GenerateRequest = {
  description: 'Customers',
  count: 2,
  fields: [{ name: 'email', type: 'string', nullable: true }],
};

function fakeFetch(response: Response | Error) {
  return vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) {
      throw response;
    }

    return response;
  });
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('buildGroqBody', () => {
  it('requests strict structured output from the configured model', () => {
    const body = buildGroqBody(request);

    expect(body).toMatchObject({
      model: GROQ_MODEL,
      response_format: {
        type: 'json_schema',
        json_schema: { strict: true, schema: buildResponseSchema(request.fields) },
      },
      reasoning_effort: 'low',
      include_reasoning: false,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    });
    expect(body.messages.map((message) => message.role)).toEqual(['system', 'user']);
  });

  it('does not set reasoning_format, which conflicts with include_reasoning', () => {
    expect(buildGroqBody(request)).not.toHaveProperty('reasoning_format');
  });
});

describe('parseRetryAfter', () => {
  it.each([
    ['7', 7],
    ['2.4', 3],
    [null, undefined],
    ['', undefined],
    ['0', undefined],
    ['soon', undefined],
  ])('parses %j as %j', (value, expected) => {
    expect(parseRetryAfter(value)).toBe(expected);
  });
});

describe('callGroq', () => {
  it('posts the body with the API key as a bearer token', async () => {
    const fetchSpy = fakeFetch(jsonResponse({ choices: [] }));

    await callGroq(request, { apiKey: 'secret-key', fetch: fetchSpy });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(GROQ_CHAT_COMPLETIONS_URL);
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret-key');
    expect(JSON.parse(String(init?.body))).toEqual(buildGroqBody(request));
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns the completion content, finish reason and usage', async () => {
    const fetchSpy = fakeFetch(
      jsonResponse({
        choices: [{ message: { content: '{"records":[]}' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 400,
          completion_tokens: 900,
          completion_tokens_details: { reasoning_tokens: 120 },
        },
      }),
    );

    expect(await callGroq(request, { apiKey: 'k', fetch: fetchSpy })).toEqual({
      ok: true,
      content: '{"records":[]}',
      finishReason: 'stop',
      usage: { promptTokens: 400, completionTokens: 900, reasoningTokens: 120 },
    });
  });

  it.each([
    [401, 'CONFIGURATION_ERROR'],
    [403, 'CONFIGURATION_ERROR'],
    [404, 'CONFIGURATION_ERROR'],
    [400, 'UPSTREAM_ERROR'],
    [413, 'UPSTREAM_ERROR'],
    [422, 'UPSTREAM_ERROR'],
    [498, 'UPSTREAM_ERROR'],
    [500, 'UPSTREAM_ERROR'],
    [503, 'UPSTREAM_ERROR'],
  ])('maps provider status %i to %s', async (status, code) => {
    const fetchSpy = fakeFetch(jsonResponse({ error: { message: 'details', type: 'x' } }, { status }));
    const result = await callGroq(request, { apiKey: 'k', fetch: fetchSpy });

    expect(result).toEqual({
      ok: false,
      failure: expect.objectContaining({ code, providerStatus: status }),
    });
  });

  it('maps a rate limit with its retry delay', async () => {
    const fetchSpy = fakeFetch(
      jsonResponse({ error: { message: 'slow down' } }, { status: 429, headers: { 'retry-after': '12' } }),
    );

    expect(await callGroq(request, { apiKey: 'k', fetch: fetchSpy })).toEqual({
      ok: false,
      failure: {
        code: 'RATE_LIMITED',
        reason: 'provider_rate_limited',
        providerStatus: 429,
        retryAfterSeconds: 12,
      },
    });
  });

  it('maps a provider schema validation failure to INVALID_GENERATION', async () => {
    const fetchSpy = fakeFetch(
      jsonResponse({ error: { message: 'bad json', code: 'json_validate_failed' } }, { status: 400 }),
    );
    const result = await callGroq(request, { apiKey: 'k', fetch: fetchSpy });

    expect(result).toEqual({
      ok: false,
      failure: expect.objectContaining({ code: 'INVALID_GENERATION' }),
    });
  });

  it.each([
    ['a timeout', new DOMException('timed out', 'TimeoutError'), 'timeout'],
    ['a network error', new TypeError('fetch failed'), 'network'],
  ])('maps %s to UPSTREAM_ERROR', async (_, error, reason) => {
    const result = await callGroq(request, { apiKey: 'k', fetch: fakeFetch(error) });

    expect(result).toEqual({ ok: false, failure: { code: 'UPSTREAM_ERROR', reason } });
  });

  it.each([
    ['a non-JSON body', new Response('<html>', { status: 200 })],
    ['no choices', jsonResponse({ choices: [] })],
  ])('maps a 200 with %s to UPSTREAM_ERROR', async (_, response) => {
    const result = await callGroq(request, { apiKey: 'k', fetch: fakeFetch(response) });

    expect(result).toEqual({
      ok: false,
      failure: expect.objectContaining({ code: 'UPSTREAM_ERROR', reason: 'provider_malformed_response' }),
    });
  });
});
