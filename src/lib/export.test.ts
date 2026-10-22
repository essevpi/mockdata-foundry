import { describe, expect, it } from 'vitest';
import { toCsv, toJson } from './export';
import type { PrimitiveValue } from './generation';

const columns = ['name', 'nickname', 'balance', 'active'];

const records: Array<Record<string, PrimitiveValue>> = [
  { name: 'Ada', nickname: null, balance: 12.5, active: true },
  { name: '', nickname: '', balance: -3, active: false },
  { name: 'He said "hi", then\nleft', nickname: 'a,b', balance: 0, active: true },
];

// Minimal RFC 4180 reader that keeps track of whether each field was quoted.
function parseCsv(csv: string) {
  const rows: Array<Array<{ quoted: boolean; value: string }>> = [];
  let row: Array<{ quoted: boolean; value: string }> = [];
  let value = '';
  let quoted = false;
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];

    if (inQuotes) {
      if (char === '"' && csv[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      inQuotes = true;
      quoted = true;
    } else if (char === ',') {
      row.push({ quoted, value });
      value = '';
      quoted = false;
    } else if (char === '\r' && csv[index + 1] === '\n') {
      row.push({ quoted, value });
      rows.push(row);
      row = [];
      value = '';
      quoted = false;
      index += 1;
    } else {
      value += char;
    }
  }

  return rows;
}

describe('toJson', () => {
  const parsed = JSON.parse(toJson(records, columns)) as Array<Record<string, PrimitiveValue>>;

  it('preserves null, empty strings, numbers, and booleans', () => {
    expect(parsed).toEqual(records);
    expect(parsed[0].nickname).toBeNull();
    expect(parsed[1].nickname).toBe('');
  });

  it('orders keys by the given columns', () => {
    const reordered = toJson([{ b: 1, a: 2 }], ['a', 'b']);

    expect(Object.keys(JSON.parse(reordered)[0])).toEqual(['a', 'b']);
  });

  it('is pretty-printed and ends with a newline', () => {
    expect(toJson(records, columns)).toMatch(/^\[\n {2}\{\n {4}"name"/);
    expect(toJson(records, columns).endsWith(']\n')).toBe(true);
  });
});

describe('toCsv', () => {
  const csv = toCsv(records, columns);
  const rows = parseCsv(csv);

  it('writes the header row without quotes', () => {
    expect(csv.startsWith('name,nickname,balance,active\r\n')).toBe(true);
  });

  it('exports null as an empty unquoted field and an empty string as ""', () => {
    expect(csv.split('\r\n')[1]).toBe('"Ada",,12.5,true');
    expect(csv.split('\r\n')[2]).toBe('"","",-3,false');
    expect(rows[1][1]).toEqual({ quoted: false, value: '' });
    expect(rows[2][1]).toEqual({ quoted: true, value: '' });
  });

  it('leaves numbers and booleans unquoted and strings always quoted', () => {
    expect(rows[1].map((field) => field.quoted)).toEqual([true, false, false, false]);
  });

  it('escapes quotes, commas, and line breaks so values round-trip', () => {
    expect(rows[3][0].value).toBe('He said "hi", then\nleft');
    expect(rows[3][1].value).toBe('a,b');
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.length === columns.length)).toBe(true);
  });

  it('orders values by the given columns, not by record key order', () => {
    expect(toCsv([{ b: 1, a: 'x' }], ['a', 'b'])).toBe('a,b\r\n"x",1\r\n');
  });

  it('treats a string "null" as text, not as a null value', () => {
    expect(toCsv([{ a: 'null' }], ['a'])).toBe('a\r\n"null"\r\n');
  });
});
