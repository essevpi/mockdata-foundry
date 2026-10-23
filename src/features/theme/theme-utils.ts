export type Theme = 'dark' | 'light';

// The inline script in index.html reads this same key before first paint.
export const THEME_STORAGE_KEY = 'mockdata-theme';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

// Dark is the default; any value other than 'light' falls back to it.
export function parseTheme(value: unknown): Theme {
  return value === 'light' ? 'light' : 'dark';
}

// Storage can be missing or throw (private windows, blocked site data); fall back to dark.
export function readStoredTheme(storage: ReadableStorage | undefined): Theme {
  try {
    return parseTheme(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'dark';
  }
}

export function storeTheme(storage: WritableStorage | undefined, theme: Theme): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The choice still applies for this visit; it just is not remembered.
  }
}
