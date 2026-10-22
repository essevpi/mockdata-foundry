import type { PrimitiveValue } from '../../lib/generation';

export type CellDisplay = {
  kind: 'boolean' | 'empty' | 'null' | 'number' | 'text';
  text: string;
};

export function formatCellValue(value: PrimitiveValue): CellDisplay {
  if (value === null) {
    return { kind: 'null', text: 'null' };
  }

  if (typeof value === 'string') {
    return value === '' ? { kind: 'empty', text: '""' } : { kind: 'text', text: value };
  }

  if (typeof value === 'number') {
    return { kind: 'number', text: String(value) };
  }

  return { kind: 'boolean', text: String(value) };
}
