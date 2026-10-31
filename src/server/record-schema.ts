import type { FieldDefinition } from '../lib/generation.js';

type JsonSchema = Record<string, unknown>;

// JSON Schema for one record: every field present, closed to undeclared properties, and a
// nullable field allowing null through a type union. It is shown to the model in the prompt's
// "# Response Formats" section (see prompt.ts); record-lines.ts enforces it.
export function buildRecordSchema(fields: FieldDefinition[]): JsonSchema {
  return {
    type: 'object',
    properties: Object.fromEntries(
      fields.map((field) => [field.name, { type: field.nullable ? [field.type, 'null'] : field.type }]),
    ),
    required: fields.map((field) => field.name),
    additionalProperties: false,
  };
}
