import {
  GENERATION_ERROR_MESSAGES,
  REQUEST_LIMITS,
  validateGenerateRequest,
  type GenerationErrorCode,
} from '../lib/generation.js';
import { callGroq, type GroqUsage } from './groq.js';
import { validateGeneratedOutput } from './output-validation.js';

// One entry per request that passed validation. It holds counts and outcomes only: never the
// API key, the description, field guidance or generated values.
export type GenerateLogEntry = {
  outcome: 'success' | GenerationErrorCode;
  status: number;
  reason?: string;
  receivedRecords?: number;
  droppedRecords?: number;
  providerStatus?: number;
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
};

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

  const result = await callGroq(generateRequest, { apiKey: deps.apiKey, fetch: deps.fetch });

  if (!result.ok) {
    const { code, providerStatus, reason, retryAfterSeconds } = result.failure;

    log({ outcome: code, status: STATUS_BY_CODE[code], reason, providerStatus });

    return errorResponse(code, { retryAfterSeconds });
  }

  const { content, finishReason, usage } = result;

  // A truncated or otherwise unfinished completion is discarded even if it happens to parse.
  const output =
    finishReason === 'stop'
      ? validateGeneratedOutput(content ?? '', generateRequest)
      : {
          ok: false as const,
          reason: `finish_reason_${finishReason ?? 'missing'}`,
          receivedRecords: undefined,
        };

  if (!output.ok) {
    log({
      outcome: 'INVALID_GENERATION',
      status: 502,
      reason: output.reason,
      receivedRecords: output.receivedRecords,
      finishReason,
      usage,
    });

    return errorResponse('INVALID_GENERATION');
  }

  log({ outcome: 'success', status: 200, droppedRecords: output.droppedRecords, finishReason, usage });

  return Response.json({ records: output.records }, { status: 200, headers: RESPONSE_HEADERS });
}
