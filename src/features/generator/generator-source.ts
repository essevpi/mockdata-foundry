import { GENERATOR_SOURCES, type GeneratorSource } from '../../lib/generate';

// Development builds only: which generator the DevTools widget selected.
export const GENERATOR_SOURCE_STORAGE_KEY = 'mockdata-generator-source';

export const GENERATOR_SOURCE_LABELS: Record<GeneratorSource, string> = {
  mock: 'Mock',
  api: 'Live API',
};

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

// The mock is the default, so `npm run dev` works without Vercel or Groq.
export function parseGeneratorSource(value: unknown): GeneratorSource {
  return GENERATOR_SOURCES.find((source) => source === value) ?? 'mock';
}

export function readStoredGeneratorSource(storage: ReadableStorage | undefined): GeneratorSource {
  try {
    return parseGeneratorSource(storage?.getItem(GENERATOR_SOURCE_STORAGE_KEY));
  } catch {
    return 'mock';
  }
}

export function storeGeneratorSource(
  storage: WritableStorage | undefined,
  source: GeneratorSource,
): void {
  try {
    storage?.setItem(GENERATOR_SOURCE_STORAGE_KEY, source);
  } catch {
    // The choice still applies until reload; it just is not remembered.
  }
}
