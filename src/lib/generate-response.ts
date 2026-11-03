import {
  DEMO_RATE_LIMIT,
  DEMO_RATE_LIMIT_TEXT,
  GENERATION_ERROR_MESSAGES,
  isRecord,
  parseRetryAfter,
  type GenerateRequest,
  type GenerateResponse,
  type GenerationError,
  type GenerationErrorCode,
  type PrimitiveValue,
} from './generation';
import { checkRecord } from './record-check';

export type RawGenerateResponse = {
  status: number;
  headers: Pick<Headers, 'get'>;
  bodyText: string;
};

function isGenerationErrorCode(value: unknown): value is GenerationErrorCode {
  return typeof value === 'string' && Object.hasOwn(GENERATION_ERROR_MESSAGES, value);
}

// The message always comes from the client's own copy, never from the response body.
function toError(code: GenerationErrorCode, retryAfterSeconds?: number): GenerationError {
  return {
    error: {
      code,
      message: GENERATION_ERROR_MESSAGES[code],
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    },
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function readRecords(
  body: unknown,
  request: GenerateRequest,
): Array<Record<string, PrimitiveValue>> | undefined {
  if (!isRecord(body) || !Array.isArray(body.records) || body.records.length !== request.count) {
    return undefined;
  }

  const records: Array<Record<string, PrimitiveValue>> = [];

  for (const value of body.records) {
    const check = checkRecord(value, request.fields);

    if (!check.ok) {
      return undefined;
    }

    records.push(check.record);
  }

  return records;
}

function readErrorEnvelope(body: unknown): GenerationError | undefined {
  if (!isRecord(body) || !isRecord(body.error) || !isGenerationErrorCode(body.error.code)) {
    return undefined;
  }

  const { retryAfterSeconds } = body.error;
  const validRetry =
    typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.ceil(retryAfterSeconds)
      : undefined;

  return toError(body.error.code, validRetry);
}

// Turns an /api/generate HTTP response into a GenerateResponse. The response is untrusted,
// like the provider output behind it: a success must hold exactly the requested number of
// records, each passing the same checkRecord the server uses. Responses that are not our
// envelope (platform error pages, the firewall's rate-limit reply, a missing endpoint) map by
// status, so the UI always gets a known error code. Messages come from the client's own copy.
export function readGenerateResponse(
  { status, headers, bodyText }: RawGenerateResponse,
  request: GenerateRequest,
): GenerateResponse {
  const body = parseJson(bodyText);

  if (status === 200) {
    const records = readRecords(body, request);

    return records ? { records } : toError('UPSTREAM_ERROR');
  }

  const envelope = readErrorEnvelope(body);

  if (envelope) {
    return envelope;
  }

  // The Vercel Firewall's reply: no Retry-After, and its window starts at the first request,
  // so a full window from now is a wait that is never too short.
  if (status === 429) {
    return {
      error: {
        code: 'RATE_LIMITED',
        message: `${DEMO_RATE_LIMIT_TEXT} from one network.`,
        retryAfterSeconds:
          parseRetryAfter(headers.get('retry-after')) ?? DEMO_RATE_LIMIT.windowSeconds,
      },
    };
  }

  if (status === 404) {
    return toError('CONFIGURATION_ERROR');
  }

  return toError(status >= 400 && status < 500 ? 'INVALID_REQUEST' : 'UPSTREAM_ERROR');
}
