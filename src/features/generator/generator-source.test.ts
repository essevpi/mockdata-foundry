import { describe, expect, it } from 'vitest';
import {
  GENERATOR_SOURCE_STORAGE_KEY,
  parseGeneratorSource,
  readStoredGeneratorSource,
  storeGeneratorSource,
} from './generator-source';

function createStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));

  return {
    data,
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

describe('parseGeneratorSource', () => {
  it('accepts api and mock and defaults everything else to mock', () => {
    expect(parseGeneratorSource('api')).toBe('api');
    expect(parseGeneratorSource('mock')).toBe('mock');
    expect(parseGeneratorSource(null)).toBe('mock');
    expect(parseGeneratorSource('groq')).toBe('mock');
  });
});

describe('stored generator source', () => {
  it('round-trips the choice', () => {
    const storage = createStorage();

    storeGeneratorSource(storage, 'api');

    expect(storage.data.get(GENERATOR_SOURCE_STORAGE_KEY)).toBe('api');
    expect(readStoredGeneratorSource(storage)).toBe('api');
  });

  it('falls back to mock when storage is missing or throws', () => {
    expect(readStoredGeneratorSource(undefined)).toBe('mock');
    expect(readStoredGeneratorSource(throwingStorage)).toBe('mock');
    expect(() => storeGeneratorSource(throwingStorage, 'api')).not.toThrow();
  });
});
