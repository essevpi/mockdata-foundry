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
  'UPSTREAM_ERROR',
  'INVALID_GENERATION',
] as const;

export type MockOutcome = (typeof MOCK_OUTCOMES)[number];

function createMockError(code: GenerationErrorCode): GenerationError['error'] {
  const error = { code, message: GENERATION_ERROR_MESSAGES[code] };

  return code === 'RATE_LIMITED' ? { ...error, retryAfterSeconds: 600 } : error;
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

export function getMockResponse(request: GenerateRequest, outcome: MockOutcome): GenerateResponse {
  if (outcome === 'success') {
    return createMockSuccess(request);
  }

  return { error: createMockError(outcome) };
}
