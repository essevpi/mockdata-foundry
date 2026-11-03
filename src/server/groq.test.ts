import { describe, expect, it, vi } from 'vitest';
import type { GenerateRequest } from '../lib/generation.js';
import {
  GROQ_CHAT_COMPLETIONS_URL,
  GROQ_MODEL,
  buildGroqBody,
  callGroq,
  getMaxCompletionTokens,
  parseResetDuration,
} from './groq.js';

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
  it('requests JSON Lines from the configured model with low reasoning effort', () => {
    const body = buildGroqBody(request);

    expect(body).toMatchObject({
      model: GROQ_MODEL,
      reasoning_effort: 'low',
      include_reasoning: false,
      max_completion_tokens: getMaxCompletionTokens(2, 1),
    });
    expect(body.messages.map((message) => message.role)).toEqual(['developer', 'user']);
  });

  it('does not send response_format or reasoning_format', () => {
    const body = buildGroqBody(request);

    expect(body).not.toHaveProperty('response_format');
    expect(body).not.toHaveProperty('reasoning_format');
  });
});

describe('getMaxCompletionTokens', () => {
  it('scales with records and fields', () => {
    expect(getMaxCompletionTokens(1, 1)).toBe(236);
    expect(getMaxCompletionTokens(25, 8)).toBe(5_650);
  });
});

describe('parseResetDuration', () => {
  it.each([
    ['705ms', 705],
    ['7.66s', 7_660],
    ['1m2.5s', 62_500],
    ['1h', 3_600_000],
    [null, undefined],
    ['', undefined],
    ['soon', undefined],
  ])('parses %j as %j', (value, expected) => {
    expect(parseResetDuration(value)).toBe(expected);
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

  it('returns the content, finish reason, usage and rate-limit budget', async () => {
    const fetchSpy = fakeFetch(
      jsonResponse(
        {
          choices: [{ message: { content: '{"email":"a@mail.test"}' }, finish_reason: 'stop' }],
          usage: {
            prompt_tokens: 400,
            completion_tokens: 900,
            completion_tokens_details: { reasoning_tokens: 120 },
          },
        },
        {
          headers: {
            'x-ratelimit-limit-tokens': '8000',
            'x-ratelimit-remaining-tokens': '6500',
            'x-ratelimit-reset-tokens': '11.25s',
          },
        },
      ),
    );

    expect(await callGroq(request, { apiKey: 'k', fetch: fetchSpy })).toEqual({
      ok: true,
      content: '{"email":"a@mail.test"}',
      finishReason: 'stop',
      usage: { promptTokens: 400, completionTokens: 900, reasoningTokens: 120 },
      rateLimit: { limitTokens: 8_000, remainingTokens: 6_500, resetTokensMs: 11_250 },
    });
  });

  it('treats missing content as empty', async () => {
    const fetchSpy = fakeFetch(jsonResponse({ choices: [{ message: {}, finish_reason: 'length' }] }));
    const result = await callGroq(request, { apiKey: 'k', fetch: fetchSpy });

    expect(result).toMatchObject({ ok: true, content: '', finishReason: 'length', rateLimit: {} });
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
