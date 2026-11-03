import { describe, expect, it } from 'vitest';
import {
  formatCellValue,
  formatRetryDelay,
  getNextResultsView,
  getResultsTabId,
} from './result-utils';

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

describe('getNextResultsView', () => {
  it('moves between views with the arrow keys and wraps around', () => {
    expect(getNextResultsView('table', 'ArrowRight')).toBe('editor');
    expect(getNextResultsView('editor', 'ArrowRight')).toBe('table');
    expect(getNextResultsView('table', 'ArrowLeft')).toBe('editor');
    expect(getNextResultsView('editor', 'ArrowLeft')).toBe('table');
  });

  it('jumps to the first and last view with Home and End', () => {
    expect(getNextResultsView('editor', 'Home')).toBe('table');
    expect(getNextResultsView('table', 'End')).toBe('editor');
  });

  it('ignores other keys', () => {
    expect(getNextResultsView('table', 'Enter')).toBeUndefined();
    expect(getNextResultsView('table', 'a')).toBeUndefined();
  });
});

describe('getResultsTabId', () => {
  it('gives each view a distinct id', () => {
    expect(getResultsTabId('table')).not.toBe(getResultsTabId('editor'));
  });
});

describe('formatRetryDelay', () => {
  it.each([
    [7, 'under a minute'],
    [59, 'under a minute'],
    [60, 'about a minute'],
    [61, 'about 2 minutes'],
    [600, 'about 10 minutes'],
    [89 * 60, 'about 89 minutes'],
    [90 * 60, 'about 2 hours'],
    [5 * 3600, 'about 5 hours'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatRetryDelay(seconds)).toBe(expected);
  });
});
