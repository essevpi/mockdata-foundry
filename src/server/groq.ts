import {
  isRecord,
  parseRetryAfter,
  type GenerateRequest,
  type GenerationErrorCode,
} from '../lib/generation.js';
import { buildMessages, type AvoidValues } from './prompt.js';

export const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'openai/gpt-oss-120b';
export const GROQ_TIMEOUT_MS = 20_000;

// Records are requested as JSON Lines without response_format. Groq's strict json_schema mode
// does not constrain gpt-oss-120b: it validates afterwards and rejects the whole reply on any
// slip, so one bad value cost every record. See PLAN.md (milestone 3) for the measurements.
//
// Output budget per request, reasoning included: measured ~65–75 tokens per 8-field record
// plus ~50 reasoning tokens. 26 tokens per field leaves room for long field names and strings
// up to the 100-character cap while keeping prompt + cap for 25 × 8 (~6.5K) within the free
// tier's 8,000 tokens per minute.
export function getMaxCompletionTokens(count: number, fieldCount: number): number {
  return 200 + count * (fieldCount * 26 + 10);
}

export type GroqUsage = {
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
};

// Groq's per-minute token budget, read from its x-ratelimit-* response headers.
export type GroqRateLimit = {
  limitTokens?: number;
  remainingTokens?: number;
  resetTokensMs?: number;
};

export type GroqFailure = {
  code: Exclude<GenerationErrorCode, 'INVALID_REQUEST' | 'INVALID_GENERATION'>;
  reason: string;
  providerStatus?: number;
  retryAfterSeconds?: number;
};

export type GroqCallResult =
  | {
      ok: true;
      content: string;
      finishReason: string | null;
      usage: GroqUsage;
      rateLimit: GroqRateLimit;
    }
  | { ok: false; failure: GroqFailure };

export type GroqCallDeps = {
  apiKey: string;
  fetch: typeof fetch;
};

export function buildGroqBody(request: GenerateRequest, avoid?: AvoidValues) {
  return {
    model: GROQ_MODEL,
    messages: buildMessages(request, avoid),
    reasoning_effort: 'low',
    include_reasoning: false,
    max_completion_tokens: getMaxCompletionTokens(request.count, request.fields.length),
  };
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readHeaderNumber(headers: Headers, name: string): number | undefined {
  const value = headers.get(name);
  const number = Number(value);

  return value !== null && value !== '' && Number.isFinite(number) ? number : undefined;
}

// Parses Groq's reset durations such as "705ms", "7.66s" or "1m2.5s" into milliseconds.
export function parseResetDuration(value: string | null): number | undefined {
  if (!value || !/^(\d+(\.\d+)?(ms|h|m|s))+$/.test(value)) {
    return undefined;
  }

  const unitMs: Record<string, number> = { h: 3_600_000, m: 60_000, s: 1_000, ms: 1 };
  let total = 0;

  for (const [, amount, , unit] of value.matchAll(/(\d+(\.\d+)?)(ms|h|m|s)/g)) {
    total += Number(amount) * unitMs[unit];
  }

  return Math.ceil(total);
}

function readRateLimit(headers: Headers): GroqRateLimit {
  return {
    limitTokens: readHeaderNumber(headers, 'x-ratelimit-limit-tokens'),
    remainingTokens: readHeaderNumber(headers, 'x-ratelimit-remaining-tokens'),
    resetTokensMs: parseResetDuration(headers.get('x-ratelimit-reset-tokens')),
  };
}

// Maps a non-2xx Groq response to a sanitized failure. Provider messages are never passed on.
function classifyErrorResponse(response: Response): GroqFailure {
  const providerStatus = response.status;

  if (providerStatus === 401 || providerStatus === 403 || providerStatus === 404) {
    return { code: 'CONFIGURATION_ERROR', reason: 'provider_rejected_configuration', providerStatus };
  }

  if (providerStatus === 429) {
    return {
      code: 'RATE_LIMITED',
      reason: 'provider_rate_limited',
      providerStatus,
      retryAfterSeconds: parseRetryAfter(response.headers.get('retry-after')),
    };
  }

  return { code: 'UPSTREAM_ERROR', reason: 'provider_error', providerStatus };
}

function readUsage(value: unknown): GroqUsage {
  if (!isRecord(value)) {
    return {};
  }

  const details = isRecord(value.completion_tokens_details) ? value.completion_tokens_details : {};

  return {
    promptTokens: readNumber(value.prompt_tokens),
    completionTokens: readNumber(value.completion_tokens),
    reasoningTokens: readNumber(details.reasoning_tokens),
  };
}

export async function callGroq(
  request: GenerateRequest,
  { apiKey, fetch: fetchFn }: GroqCallDeps,
  avoid?: AvoidValues,
): Promise<GroqCallResult> {
  let response: Response;

  try {
    response = await fetchFn(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGroqBody(request, avoid)),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';

    return { ok: false, failure: { code: 'UPSTREAM_ERROR', reason: timedOut ? 'timeout' : 'network' } };
  }

  if (!response.ok) {
    return { ok: false, failure: classifyErrorResponse(response) };
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const choice = isRecord(body) && Array.isArray(body.choices) ? body.choices[0] : undefined;

  if (!isRecord(body) || !isRecord(choice) || !isRecord(choice.message)) {
    return {
      ok: false,
      failure: { code: 'UPSTREAM_ERROR', reason: 'provider_malformed_response', providerStatus: 200 },
    };
  }

  return {
    ok: true,
    content: readString(choice.message.content) ?? '',
    finishReason: readString(choice.finish_reason) ?? null,
    usage: readUsage(body.usage),
    rateLimit: readRateLimit(response.headers),
  };
}
