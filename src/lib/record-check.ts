import {
  REQUEST_LIMITS,
  isRecord,
  type FieldDefinition,
  type PrimitiveValue,
} from './generation.js';

export type RecordProblem = 'wrong_shape' | 'field_set' | 'type' | 'null_not_allowed' | 'string_length';

export type RecordCheck =
  | { ok: true; record: Record<string, PrimitiveValue> }
  | { ok: false; problem: RecordProblem };

function checkValue(value: unknown, field: FieldDefinition): RecordProblem | undefined {
  if (value === null) {
    return field.nullable ? undefined : 'null_not_allowed';
  }

  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') {
        return 'type';
      }

      // Count code points, so an emoji counts as one character.
      return Array.from(value).length > REQUEST_LIMITS.returnedStringMaxLength
        ? 'string_length'
        : undefined;
    case 'number':
      // JSON.parse turns out-of-range literals such as 1e999 into Infinity.
      return typeof value === 'number' && Number.isFinite(value) ? undefined : 'type';
    case 'integer':
      return typeof value === 'number' && Number.isSafeInteger(value) ? undefined : 'type';
    case 'boolean':
      return typeof value === 'boolean' ? undefined : 'type';
  }
}

// Checks one generated record against the declared fields: exactly those fields, declared
// types, nulls only where allowed and strings within the length cap. Shared by the server
// (provider output) and the browser (the /api/generate response), since both are untrusted.
export function checkRecord(value: unknown, fields: FieldDefinition[]): RecordCheck {
  if (!isRecord(value)) {
    return { ok: false, problem: 'wrong_shape' };
  }

  if (
    Object.keys(value).length !== fields.length ||
    !fields.every((field) => Object.hasOwn(value, field.name))
  ) {
    return { ok: false, problem: 'field_set' };
  }

  for (const field of fields) {
    const problem = checkValue(value[field.name], field);

    if (problem) {
      return { ok: false, problem };
    }
  }

  // Rebuilt in the declared field order so previews and exports are stable.
  return {
    ok: true,
    record: Object.fromEntries(
      fields.map((field) => [field.name, value[field.name] as PrimitiveValue]),
    ),
  };
}
