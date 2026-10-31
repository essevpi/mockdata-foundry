import { describe, expect, it } from 'vitest';
import { toJson } from '../../lib/export';
import type { PrimitiveValue } from '../../lib/generation';
import { tokenizeJsonLines, type JsonToken } from './json-tokens';

function joinLines(lines: JsonToken[][]) {
  return lines.map((line) => line.map((token) => token.text).join('')).join('\n');
}

function kindsAndText(line: JsonToken[]) {
  return line.map((token) => [token.kind, token.text]);
}

const COLUMNS = ['id', 'name', 'nickname', 'active', 'score', 'note'];

const SAMPLE_RECORDS: Array<Record<string, PrimitiveValue>> = [
  { id: 1, name: 'Ada', nickname: null, active: true, score: -3.5, note: '' },
  {
    id: 2,
    name: 'He said "hi", then left',
    nickname: '',
    active: false,
    score: 1e21,
    note: 'line one\nline two \\ back: slash',
  },
  { id: 3, name: 'Zoë 日本', nickname: 'a:b', active: true, score: 0, note: 'x' },
];

describe('tokenizeJsonLines', () => {
  it('restores the toJson output exactly when joined', () => {
    const json = toJson(SAMPLE_RECORDS, COLUMNS);

    expect(`${joinLines(tokenizeJsonLines(json))}\n`).toBe(json);
  });

  it('does not add an empty last line for the trailing newline', () => {
    const lines = tokenizeJsonLines('[\n  1\n]\n');

    expect(lines).toHaveLength(3);
    expect(tokenizeJsonLines('[\n  1\n]')).toHaveLength(3);
    expect(tokenizeJsonLines('')).toEqual([]);
  });

  it('tokenizes a null property line', () => {
    const lines = tokenizeJsonLines(toJson([{ nickname: null }], ['nickname']));

    expect(kindsAndText(lines[2])).toEqual([
      ['whitespace', '    '],
      ['key', '"nickname"'],
      ['punctuation', ':'],
      ['whitespace', ' '],
      ['null', 'null'],
    ]);
  });

  it('distinguishes null from an empty string', () => {
    const lines = tokenizeJsonLines(toJson([{ a: null, b: '' }], ['a', 'b']));

    expect(kindsAndText(lines[2]).at(-2)).toEqual(['null', 'null']);
    expect(kindsAndText(lines[3]).at(-1)).toEqual(['string', '""']);
  });

  it('separates keys from string values and keeps colons inside strings', () => {
    const lines = tokenizeJsonLines('{\n  "a:b": "c: d",\n  "e": "f"\n}');

    expect(kindsAndText(lines[1])).toEqual([
      ['whitespace', '  '],
      ['key', '"a:b"'],
      ['punctuation', ':'],
      ['whitespace', ' '],
      ['string', '"c: d"'],
      ['punctuation', ','],
    ]);
    expect(lines[2].map((token) => token.kind)).toEqual([
      'whitespace',
      'key',
      'punctuation',
      'whitespace',
      'string',
    ]);
  });

  it('keeps escaped quotes and backslashes inside one string token', () => {
    const lines = tokenizeJsonLines(toJson([{ t: 'say "hi" \\ \n bye' }], ['t']));
    const value = lines[2].at(-1);

    expect(value).toEqual({ kind: 'string', text: '"say \\"hi\\" \\\\ \\n bye"' });
  });

  it('tokenizes negative, decimal and exponent numbers and booleans', () => {
    const lines = tokenizeJsonLines(
      toJson([{ a: -1, b: 3.14, c: 1e21, d: 0, e: true, f: false }], ['a', 'b', 'c', 'd', 'e', 'f']),
    );
    const values = lines.slice(2, 8).map((line) => line.filter((token) => token.kind !== 'whitespace')[2]);

    expect(values.map((token) => [token.kind, token.text])).toEqual([
      ['number', '-1'],
      ['number', '3.14'],
      ['number', '1e+21'],
      ['number', '0'],
      ['boolean', 'true'],
      ['boolean', 'false'],
    ]);
  });

  it('keeps unrecognised text as plain tokens without losing it', () => {
    const lines = tokenizeJsonLines('{\n  ??? "a": 1\n}');

    expect(joinLines(lines)).toBe('{\n  ??? "a": 1\n}');
    expect(lines[1].some((token) => token.kind === 'plain' && token.text === '???')).toBe(true);
  });

  it('handles the largest export: 25 records with 8 fields', () => {
    const columns = Array.from({ length: 8 }, (_, index) => `field${index + 1}`);
    const records = Array.from({ length: 25 }, (_, row) =>
      Object.fromEntries(
        columns.map((column, index): [string, PrimitiveValue] => [
          column,
          index % 4 === 0 ? row : index % 4 === 1 ? `value ${row}` : index % 4 === 2 ? null : row % 2 === 0,
        ]),
      ),
    );
    const json = toJson(records, columns);
    const lines = tokenizeJsonLines(json);

    expect(lines).toHaveLength(2 + 25 * (8 + 2));
    expect(`${joinLines(lines)}\n`).toBe(json);
  });
});
