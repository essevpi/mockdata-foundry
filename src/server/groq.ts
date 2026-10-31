import { isRecord, type GenerateRequest, type GenerationErrorCode } from '../lib/generation.js';
import { buildMessages } from './prompt.js';
import { RESPONSE_SCHEMA_NAME, buildResponseSchema } from './response-schema.js';

export const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'openai/gpt-oss-120b';
// A maximum-size request (50 × 8) uses ~4.5–5.8K completion tokens, more when the model
// overshoots the record count. With a ~700-token prompt, 7,000 still fits the free tier's
// 8,000 tokens per minute.
export const MAX_COMPLETION_TOKENS = 7_000;
export const GROQ_TIMEOUT_MS = 45_000;

export type GroqUsage = {
  promptTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
};

export type GroqFailure = {
  code: Exclude<GenerationErrorCode, 'INVALID_REQUEST'>;
  reason: string;
  providerStatus?: number;
  retryAfterSeconds?: number;
};

export type GroqCallResult =
  | { ok: true; content: string | null; finishReason: string | null; usage: GroqUsage }
  | { ok: false; failure: GroqFailure };

export type GroqCallDeps = {
  apiKey: string;
  fetch: typeof fetch;
};

export function buildGroqBody(request: GenerateRequest) {
  return {
    model: GROQ_MODEL,
    messages: buildMessages(request),
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: RESPONSE_SCHEMA_NAME,
        strict: true,
        schema: buildResponseSchema(request.fields),
      },
    },
    reasoning_effort: 'low',
    include_reasoning: false,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
  };
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseRetryAfter(value: string | null): number | undefined {
  const seconds = Number(value);

  return value !== null && Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

async function readProviderErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();

    return isRecord(body) && isRecord(body.error) ? readString(body.error.code) : undefined;
  } catch {
    return undefined;
  }
}

// Maps a non-2xx Groq response to a sanitized failure. Provider messages are never passed on.
async function classifyErrorResponse(response: Response): Promise<GroqFailure> {
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

  // Groq answers with this code when the output fails the schema, including when the
  // completion hits max_completion_tokens mid-JSON (it does not return finish_reason
  // "length" in strict mode). Treat it as a generation failure, not a provider outage.
  if (providerStatus === 400 && (await readProviderErrorCode(response)) === 'json_validate_failed') {
    return { code: 'INVALID_GENERATION', reason: 'provider_schema_validation', providerStatus };
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
): Promise<GroqCallResult> {
  let response: Response;

  try {
    response = await fetchFn(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGroqBody(request)),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';

    return { ok: false, failure: { code: 'UPSTREAM_ERROR', reason: timedOut ? 'timeout' : 'network' } };
  }

  if (!response.ok) {
    return { ok: false, failure: await classifyErrorResponse(response) };
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
    content: readString(choice.message.content) ?? null,
    finishReason: readString(choice.finish_reason) ?? null,
    usage: readUsage(body.usage),
  };
}
