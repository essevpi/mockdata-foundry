import type {
  FieldDefinition,
  GenerateRequest,
  GenerateResponse,
  GenerateSuccess,
  GenerationError,
  GenerationErrorCode,
  PrimitiveValue,
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

const MOCK_ERRORS: Record<GenerationErrorCode, GenerationError['error']> = {
  INVALID_REQUEST: {
    code: 'INVALID_REQUEST',
    message: 'The request was not accepted. Check your description and fields, then try again.',
  },
  CONFIGURATION_ERROR: {
    code: 'CONFIGURATION_ERROR',
    message: 'Data generation is not available right now. Please try again later.',
  },
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please wait before generating again.',
    retryAfterSeconds: 600,
  },
  UPSTREAM_ERROR: {
    code: 'UPSTREAM_ERROR',
    message: 'The data provider could not complete the request. Please try again.',
  },
  INVALID_GENERATION: {
    code: 'INVALID_GENERATION',
    message: 'The generated data did not match your fields, so it was discarded. Please try again.',
  },
};

// Deterministic placeholder values. Nullable fields are null on some rows and string
// fields are empty on others, so both cases are visible in the results table.
function createMockValue(field: FieldDefinition, rowIndex: number, fieldIndex: number): PrimitiveValue {
  if (field.nullable && (rowIndex + fieldIndex) % 3 === 2) {
    return null;
  }

  switch (field.type) {
    case 'string':
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

  return { error: MOCK_ERRORS[outcome] };
}
