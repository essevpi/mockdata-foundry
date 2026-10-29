import {
  REQUEST_LIMITS,
  isRecord,
  type FieldDefinition,
  type GenerateRequest,
  type PrimitiveValue,
} from '../lib/generation.js';

export type OutputFailureReason =
  | 'invalid_json'
  | 'wrong_shape'
  | 'record_count'
  | 'field_set'
  | 'type'
  | 'null_not_allowed'
  | 'string_length';

export type OutputValidationResult =
  | { ok: true; records: Array<Record<string, PrimitiveValue>> }
  | { ok: false; reason: OutputFailureReason };

class OutputError extends Error {
  readonly reason: OutputFailureReason;

  constructor(reason: OutputFailureReason) {
    super(reason);
    this.reason = reason;
  }
}

function checkValue(value: unknown, field: FieldDefinition): PrimitiveValue {
  if (value === null) {
    if (!field.nullable) {
      throw new OutputError('null_not_allowed');
    }

    return null;
  }

  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new OutputError('type');
      }

      // Count code points, so an emoji counts as one character.
      if (Array.from(value).length > REQUEST_LIMITS.returnedStringMaxLength) {
        throw new OutputError('string_length');
      }

      return value;
    case 'number':
      // JSON.parse turns out-of-range literals such as 1e999 into Infinity.
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new OutputError('type');
      }

      return value;
    case 'integer':
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        throw new OutputError('type');
      }

      return value;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new OutputError('type');
      }

      return value;
  }
}

function checkRecord(value: unknown, fields: FieldDefinition[]): Record<string, PrimitiveValue> {
  if (!isRecord(value)) {
    throw new OutputError('wrong_shape');
  }

  const keys = Object.keys(value);

  if (
    keys.length !== fields.length ||
    !fields.every((field) => Object.hasOwn(value, field.name))
  ) {
    throw new OutputError('field_set');
  }

  // Rebuilt in the declared field order so previews and exports are stable.
  return Object.fromEntries(fields.map((field) => [field.name, checkValue(value[field.name], field)]));
}

// Validates provider output against the request: the exact record count, the exact field set,
// declared types, nullability and the string length cap. Provider output is untrusted, so
// nothing reaches the client unless every record passes.
export function validateGeneratedOutput(
  content: string,
  request: GenerateRequest,
): OutputValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  if (!isRecord(parsed) || Object.keys(parsed).length !== 1 || !Array.isArray(parsed.records)) {
    return { ok: false, reason: 'wrong_shape' };
  }

  if (parsed.records.length !== request.count) {
    return { ok: false, reason: 'record_count' };
  }

  try {
    return {
      ok: true,
      records: parsed.records.map((record) => checkRecord(record, request.fields)),
    };
  } catch (error) {
    if (error instanceof OutputError) {
      return { ok: false, reason: error.reason };
    }

    throw error;
  }
}
