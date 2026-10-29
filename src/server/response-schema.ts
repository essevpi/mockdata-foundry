import type { FieldDefinition } from '../lib/generation.js';

export const RESPONSE_SCHEMA_NAME = 'mock_records';

type JsonSchema = Record<string, unknown>;

// Builds the strict-mode schema sent to Groq: every field is required and every object is
// closed. A nullable field stays required and allows null through a type union. Strict mode
// does not document maxLength or minItems/maxItems, so record count and string length are
// enforced by output validation instead.
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
