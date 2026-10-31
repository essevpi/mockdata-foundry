import type { FieldDefinition } from '../lib/generation.js';

export const RESPONSE_SCHEMA_NAME = 'mock_records';

type JsonSchema = Record<string, unknown>;

// Builds the strict-mode schema sent to Groq: every field is required and every object is
// closed. A nullable field stays required and allows null through a type union.
//
// The records array has no length bounds. Smoke tests showed gpt-oss-120b overshooting the
// requested count, and Groq checks minItems/maxItems only after generation, rejecting the
// whole output. Output validation keeps the first `count` records instead. A fixed-key object
// (r01…rNN, all required) does give exact counts, but adds ~100 prompt tokens per record,
// which does not fit 50 records in the free tier's 8,000 tokens per minute.
export function buildResponseSchema(fields: FieldDefinition[]): JsonSchema {
  return {
    type: 'object',
    properties: {
      records: {
        type: 'array',
        items: {
          type: 'object',
          properties: Object.fromEntries(
            fields.map((field) => [
              field.name,
              { type: field.nullable ? [field.type, 'null'] : field.type },
            ]),
          ),
          required: fields.map((field) => field.name),
          additionalProperties: false,
        },
      },
    },
    required: ['records'],
    additionalProperties: false,
  };
}
