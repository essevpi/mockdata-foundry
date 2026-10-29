import {
  GENERATION_ERROR_MESSAGES,
  REQUEST_LIMITS,
  validateGenerateRequest,
  type GenerationErrorCode,
} from '../lib/generation.js';

export type GenerateHandlerDeps = {
  apiKey: string | undefined;
  fetch: typeof fetch;
};

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
};

function errorResponse(
  status: number,
  code: GenerationErrorCode,
  headers: Record<string, string> = {},
): Response {
  return Response.json(
    { error: { code, message: GENERATION_ERROR_MESSAGES[code] } },
    { status, headers: { ...RESPONSE_HEADERS, ...headers } },
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
    return errorResponse(405, 'INVALID_REQUEST', { Allow: 'POST' });
  }

  const declaredLength = Number(request.headers.get('content-length'));

  if (declaredLength > REQUEST_LIMITS.maxRequestBytes) {
    return errorResponse(413, 'INVALID_REQUEST');
  }

  if (!isJsonContentType(request.headers.get('content-type'))) {
    return errorResponse(415, 'INVALID_REQUEST');
  }

  const body = await request.arrayBuffer();

  if (body.byteLength > REQUEST_LIMITS.maxRequestBytes) {
    return errorResponse(413, 'INVALID_REQUEST');
  }

  let payload: unknown;

  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return errorResponse(400, 'INVALID_REQUEST');
  }

  const validation = validateGenerateRequest(payload);

  if (!validation.valid) {
    return errorResponse(400, 'INVALID_REQUEST');
  }

  if (!deps.apiKey) {
    return errorResponse(500, 'CONFIGURATION_ERROR');
  }

  // The Groq call is added in task 3.3; until then a valid request reports the service as
  // unavailable.
  return errorResponse(500, 'CONFIGURATION_ERROR');
}
