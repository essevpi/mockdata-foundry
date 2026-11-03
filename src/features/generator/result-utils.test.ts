import { describe, expect, it } from 'vitest';
import {
  formatCellValue,
  describeRetry,
  getNoResponseMessage,
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

describe('describeRetry', () => {
  const receivedAt = Date.UTC(2026, 10, 3, 11, 29, 20);
  const clock = { locale: 'en-GB', timeZone: 'UTC' };

  it('reads short waits as under a minute', () => {
    expect(describeRetry(7, receivedAt, clock)).toBe('You can try again in under a minute.');
  });

  it('gives a clock time rounded up to the minute', () => {
    expect(describeRetry(600, receivedAt, clock)).toBe('You can generate again by 11:40.');
    expect(describeRetry(60, Date.UTC(2026, 10, 3, 11, 29), clock)).toBe(
      'You can generate again by 11:30.',
    );
  });

  it('handles waits of several hours, such as a daily cap', () => {
    expect(describeRetry(5 * 3_600, receivedAt, clock)).toBe('You can generate again by 16:30.');
  });
});

describe('getNoResponseMessage', () => {
  it('tells a timeout apart from a network failure', () => {
    expect(getNoResponseMessage(new DOMException('timed out', 'TimeoutError'))).toMatch(/too long/);
    expect(getNoResponseMessage(new TypeError('Failed to fetch'))).toMatch(/could not be reached/);
  });
});
