import {
  GENERATION_ERROR_MESSAGES,
  REQUEST_LIMITS,
  validateGenerateRequest,
  type GenerationErrorCode,
  type PrimitiveValue,
} from '../lib/generation.js';
import { callGroq, getMaxCompletionTokens, type GroqUsage } from './groq.js';
import type { AvoidValues } from './prompt.js';
import { parseRecordLines, type LineProblem } from './record-lines.js';
import { getAvoidValues, getTopUpDelayMs } from './top-up.js';

// One entry per provider call (or per early configuration failure). It holds counts and
// outcomes only: never the API key, the description, field guidance or generated values.
// "partial" means a top-up call follows; the last entry of a request carries its status.
export type GenerateLogEntry = {
  outcome: 'success' | 'partial' | GenerationErrorCode;
  status?: number;
  attempt?: number;
  reason?: string;
  providerStatus?: number;
  requestedRecords?: number;
  validRecords?: number;
  skippedLines?: Partial<Record<LineProblem, number>>;
  finishReason?: string | null;
  usage?: GroqUsage;
  records: number;
  fields: number;
  durationMs: number;
};

export type GenerateHandlerDeps = {
  apiKey: string | undefined;
  fetch: typeof fetch;
  log: (entry: GenerateLogEntry) => void;
  sleep?: (ms: number) => Promise<void>;
};

// Prompt tokens assumed for a top-up when the first reply reported none, and the extra
// allowance for the list of values it must not repeat.
const FALLBACK_PROMPT_TOKENS = 1_000;
const AVOID_LIST_TOKENS = 300;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
};

const STATUS_BY_CODE: Record<GenerationErrorCode, number> = {
  INVALID_REQUEST: 400,
  CONFIGURATION_ERROR: 500,
  RATE_LIMITED: 429,
  UPSTREAM_ERROR: 502,
  INVALID_GENERATION: 502,
};

function errorResponse(
  code: GenerationErrorCode,
  { status = STATUS_BY_CODE[code], retryAfterSeconds, headers = {} }: {
    status?: number;
    retryAfterSeconds?: number;
    headers?: Record<string, string>;
  } = {},
): Response {
  const retryHeaders: Record<string, string> =
    retryAfterSeconds === undefined ? {} : { 'Retry-After': String(retryAfterSeconds) };

  return Response.json(
    { error: { code, message: GENERATION_ERROR_MESSAGES[code], retryAfterSeconds } },
    { status, headers: { ...RESPONSE_HEADERS, ...retryHeaders, ...headers } },
  );
}

function isJsonContentType(value: string | null): boolean {
  return value?.split(';')[0].trim().toLowerCase() === 'application/json';
}

// Handles POST /api/generate. Everything up to request validation runs before any provider
// call, so malformed, oversized and out-of-range requests never reach Groq.
export async function handleGenerate(
  request: Request,
  deps: GenerateHandlerDeps,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('INVALID_REQUEST', { status: 405, headers: { Allow: 'POST' } });
  }

  const declaredLength = Number(request.headers.get('content-length'));

  if (declaredLength > REQUEST_LIMITS.maxRequestBytes) {
    return errorResponse('INVALID_REQUEST', { status: 413 });
  }

  if (!isJsonContentType(request.headers.get('content-type'))) {
    return errorResponse('INVALID_REQUEST', { status: 415 });
  }

  const body = await request.arrayBuffer();

  if (body.byteLength > REQUEST_LIMITS.maxRequestBytes) {
    return errorResponse('INVALID_REQUEST', { status: 413 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return errorResponse('INVALID_REQUEST');
  }

  const validation = validateGenerateRequest(payload);

  if (!validation.valid) {
    return errorResponse('INVALID_REQUEST');
  }

  const generateRequest = validation.data;
  const startedAt = Date.now();
  const log = (entry: Omit<GenerateLogEntry, 'records' | 'fields' | 'durationMs'>) =>
    deps.log({
      ...entry,
      records: generateRequest.count,
      fields: generateRequest.fields.length,
      durationMs: Date.now() - startedAt,
    });

  if (!deps.apiKey) {
    log({ outcome: 'CONFIGURATION_ERROR', status: 500, reason: 'missing_api_key' });

    return errorResponse('CONFIGURATION_ERROR');
  }

  const groqDeps = { apiKey: deps.apiKey, fetch: deps.fetch };
  const sleep = deps.sleep ?? defaultSleep;
  const records: Array<Record<string, PrimitiveValue>> = [];
  let attemptRequest = generateRequest;
  let avoid: AvoidValues | undefined;

  // One request for all records, then at most one top-up for the ones still missing, only when
  // Groq's per-minute token budget and the time budget allow it.
  for (let attempt = 1; ; attempt += 1) {
    const result = await callGroq(attemptRequest, groqDeps, avoid);

    if (!result.ok) {
      const { code, providerStatus, reason, retryAfterSeconds } = result.failure;

      log({ outcome: code, status: STATUS_BY_CODE[code], attempt, reason, providerStatus });

      return errorResponse(code, { retryAfterSeconds });
    }

    const parsed = parseRecordLines(result.content, generateRequest.fields);
    const missingBefore = generateRequest.count - records.length;

    // Surplus records beyond the requested count are dropped; kept records are unchanged.
    records.push(...parsed.records.slice(0, missingBefore));

    const missing = generateRequest.count - records.length;
    const attemptLog = {
      attempt,
      requestedRecords: attemptRequest.count,
      validRecords: parsed.records.length,
      skippedLines: parsed.skipped,
      finishReason: result.finishReason,
      usage: result.usage,
    };

    if (missing === 0) {
      log({ outcome: 'success', status: 200, ...attemptLog });

      return Response.json({ records }, { status: 200, headers: RESPONSE_HEADERS });
    }

    const neededTokens =
      (result.usage.promptTokens ?? FALLBACK_PROMPT_TOKENS) +
      AVOID_LIST_TOKENS +
      getMaxCompletionTokens(missing, generateRequest.fields.length);
    const delayMs =
      attempt === 1 ? getTopUpDelayMs(result.rateLimit, neededTokens, Date.now() - startedAt) : undefined;

    if (delayMs === undefined) {
      log({ outcome: 'INVALID_GENERATION', status: 502, reason: 'too_few_records', ...attemptLog });

      return errorResponse('INVALID_GENERATION');
    }

    log({ outcome: 'partial', ...attemptLog });

    if (delayMs > 0) {
      await sleep(delayMs);
    }

    attemptRequest = { ...generateRequest, count: missing };
    avoid = getAvoidValues(generateRequest, records);
  }
}
