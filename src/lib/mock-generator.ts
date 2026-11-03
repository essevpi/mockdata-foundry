import { readGenerateResponse } from './generate-response';
import {
  GENERATION_ERROR_MESSAGES,
  type FieldDefinition,
  type GenerateRequest,
  type GenerateResponse,
  type GenerateSuccess,
  type GenerationError,
  type GenerationErrorCode,
  type PrimitiveValue,
} from './generation';

export const MOCK_OUTCOMES = [
  'success',
  'INVALID_REQUEST',
  'CONFIGURATION_ERROR',
  'RATE_LIMITED',
  'FIREWALL_LIMIT',
  'UPSTREAM_ERROR',
  'INVALID_GENERATION',
] as const;

export type MockOutcome = (typeof MOCK_OUTCOMES)[number];

function createMockError(code: GenerationErrorCode): GenerationError['error'] {
  const error = { code, message: GENERATION_ERROR_MESSAGES[code] };

  // Like Groq's per-minute token limit; FIREWALL_LIMIT covers the longer firewall wait.
  return code === 'RATE_LIMITED' ? { ...error, retryAfterSeconds: 30 } : error;
}

// Contains a quote, a comma, and a line break so export escaping can be checked by eye.
const AWKWARD_TEXT = 'He said "hi", then\nleft';

// Deterministic placeholder values. Nullable fields are null on some rows and string
// fields are empty on others, so both cases are visible in the results table. Every seventh
// row holds the awkward text above.
function createMockValue(field: FieldDefinition, rowIndex: number, fieldIndex: number): PrimitiveValue {
  if (field.nullable && (rowIndex + fieldIndex) % 3 === 2) {
    return null;
  }

  switch (field.type) {
    case 'string':
      if (rowIndex % 7 === 6) {
        return AWKWARD_TEXT;
      }

      return rowIndex % 5 === 4 ? '' : `${field.name} ${rowIndex + 1}`;
    case 'number':
      return Math.round(((rowIndex + 1) * 1.5 + fieldIndex * 0.25) * 100) / 100;
    case 'integer':
      return (rowIndex + 1) * 10 + fieldIndex;
    case 'boolean':
      return (rowIndex + fieldIndex) % 2 === 0;
  }
}

export function createMockSuccess(request: GenerateRequest): GenerateSuccess {
  return {
    records: Array.from({ length: request.count }, (_, rowIndex) =>
      Object.fromEntries(
        request.fields.map((field, fieldIndex) => [
          field.name,
          createMockValue(field, rowIndex, fieldIndex),
        ]),
      ),
    ),
  };
}

// The Vercel Firewall's rate-limit reply as measured in November 2026, read through the same
// path as a live response.
const FIREWALL_REPLY = {
  status: 429,
  headers: new Headers({ 'Content-Type': 'application/json' }),
  bodyText: '{"error":{"code":"429","message":"Too Many Requests","id":"mock"}}',
};

export function getMockResponse(request: GenerateRequest, outcome: MockOutcome): GenerateResponse {
  if (outcome === 'success') {
    return createMockSuccess(request);
  }

  if (outcome === 'FIREWALL_LIMIT') {
    return readGenerateResponse(FIREWALL_REPLY, request);
  }

  return { error: createMockError(outcome) };
}
