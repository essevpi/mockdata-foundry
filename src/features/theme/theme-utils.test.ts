import { describe, expect, it } from 'vitest';
import { parseTheme, readStoredTheme, storeTheme, THEME_STORAGE_KEY } from './theme-utils';

function createStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const throwingStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('parseTheme', () => {
  it('accepts light and defaults everything else to dark', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme(null)).toBe('dark');
    expect(parseTheme('purple')).toBe('dark');
  });
});

describe('readStoredTheme', () => {
  it('reads the stored choice', () => {
    expect(readStoredTheme(createStorage({ [THEME_STORAGE_KEY]: 'light' }))).toBe('light');
  });

  it('falls back to dark when nothing is stored, storage is missing or throws', () => {
    expect(readStoredTheme(createStorage())).toBe('dark');
    expect(readStoredTheme(undefined)).toBe('dark');
    expect(readStoredTheme(throwingStorage)).toBe('dark');
  });
});

describe('storeTheme', () => {
  it('stores the choice and ignores storage errors', () => {
    const storage = createStorage();

    storeTheme(storage, 'light');

    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(() => storeTheme(throwingStorage, 'dark')).not.toThrow();
    expect(() => storeTheme(undefined, 'dark')).not.toThrow();
  });
});
