import type { FieldDefinition, PrimitiveValue } from '../lib/generation.js';
import { checkRecord, type RecordProblem } from '../lib/record-check.js';

export type LineProblem = 'not_json' | RecordProblem;

export type ParsedRecordLines = {
  records: Array<Record<string, PrimitiveValue>>;
  skipped: Partial<Record<LineProblem, number>>;
};

function parseLine(line: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(line) };
  } catch {
    return { ok: false };
  }
}

// Parses provider output written as JSON Lines (one record per line). Provider output is
// untrusted: each line must be a JSON object that passes checkRecord. Valid records are kept
// unchanged and in order; any other line (a malformed or truncated record, a stray code fence
// or comment) is skipped and counted by problem, so one slip costs one record rather than the
// whole reply.
export function parseRecordLines(content: string, fields: FieldDefinition[]): ParsedRecordLines {
  const records: ParsedRecordLines['records'] = [];
  const skipped: ParsedRecordLines['skipped'] = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (trimmed === '') {
      continue;
    }

    const parsed = parseLine(trimmed);
    const check = parsed.ok
      ? checkRecord(parsed.value, fields)
      : ({ ok: false, problem: 'not_json' } as const);

    if (check.ok) {
      records.push(check.record);
    } else {
      skipped[check.problem] = (skipped[check.problem] ?? 0) + 1;
    }
  }

  return { records, skipped };
}
