import {
  REQUEST_LIMITS,
  isRecord,
  type FieldDefinition,
  type PrimitiveValue,
} from '../lib/generation.js';

export type LineProblem =
  | 'not_json'
  | 'wrong_shape'
  | 'field_set'
  | 'type'
  | 'null_not_allowed'
  | 'string_length';

export type ParsedRecordLines = {
  records: Array<Record<string, PrimitiveValue>>;
  skipped: Partial<Record<LineProblem, number>>;
};

class LineError extends Error {
  readonly problem: LineProblem;

  constructor(problem: LineProblem) {
    super(problem);
    this.problem = problem;
  }
}

function checkValue(value: unknown, field: FieldDefinition): PrimitiveValue {
  if (value === null) {
    if (!field.nullable) {
      throw new LineError('null_not_allowed');
    }

    return null;
  }

  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new LineError('type');
      }

      // Count code points, so an emoji counts as one character.
      if (Array.from(value).length > REQUEST_LIMITS.returnedStringMaxLength) {
        throw new LineError('string_length');
      }

      return value;
    case 'number':
      // JSON.parse turns out-of-range literals such as 1e999 into Infinity.
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new LineError('type');
      }

      return value;
    case 'integer':
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        throw new LineError('type');
      }

      return value;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new LineError('type');
      }

      return value;
  }
}

function checkRecord(value: unknown, fields: FieldDefinition[]): Record<string, PrimitiveValue> {
  if (!isRecord(value)) {
    throw new LineError('wrong_shape');
  }

  const keys = Object.keys(value);

  if (
    keys.length !== fields.length ||
    !fields.every((field) => Object.hasOwn(value, field.name))
  ) {
    throw new LineError('field_set');
  }

  // Rebuilt in the declared field order so previews and exports are stable.
  return Object.fromEntries(fields.map((field) => [field.name, checkValue(value[field.name], field)]));
}

// Parses provider output written as JSON Lines (one record per line). Provider output is
// untrusted: each line must be a JSON object with exactly the declared fields, declared types,
// allowed nulls and strings within the length cap. Valid records are kept unchanged and in
// order; any other line (a malformed or truncated record, a stray code fence or comment) is
// skipped and counted by problem, so one slip costs one record rather than the whole reply.
export function parseRecordLines(content: string, fields: FieldDefinition[]): ParsedRecordLines {
  const records: ParsedRecordLines['records'] = [];
  const skipped: ParsedRecordLines['skipped'] = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (trimmed === '') {
      continue;
    }

    try {
      let parsed: unknown;

      try {
        parsed = JSON.parse(trimmed);
      } catch {
        throw new LineError('not_json');
      }

      records.push(checkRecord(parsed, fields));
    } catch (error) {
      if (!(error instanceof LineError)) {
        throw error;
      }

      skipped[error.problem] = (skipped[error.problem] ?? 0) + 1;
    }
  }

  return { records, skipped };
}
