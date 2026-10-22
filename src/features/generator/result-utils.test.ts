import { describe, expect, it } from 'vitest';
import { formatCellValue } from './result-utils';

describe('formatCellValue', () => {
  it('distinguishes null from an empty string', () => {
    expect(formatCellValue(null)).toEqual({ kind: 'null', text: 'null' });
    expect(formatCellValue('')).toEqual({ kind: 'empty', text: '""' });
  });

  it('shows the string "null" as ordinary text, not as a null value', () => {
    expect(formatCellValue('null')).toEqual({ kind: 'text', text: 'null' });
  });

  it('formats numbers and booleans', () => {
    expect(formatCellValue(0)).toEqual({ kind: 'number', text: '0' });
    expect(formatCellValue(-1.5)).toEqual({ kind: 'number', text: '-1.5' });
    expect(formatCellValue(false)).toEqual({ kind: 'boolean', text: 'false' });
  });
});
